import { createAdminClient } from '@/lib/supabase/admin'

export interface WorkingHourSlot {
  day_of_week: number
  start_time: string // "09:00"
  end_time: string   // "18:00"
  is_active: boolean
}

export interface BeraterAvailability {
  beraterId: string
  status: 'offline' | 'available' | 'busy' | 'on_call'
  isWithinWorkingHours: boolean
  hasManualOverride: boolean
  nextAvailableAt: Date | null
  currentSlot: WorkingHourSlot | null
}

/** Day name mapping for German labels */
const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

/**
 * Parse a time string like "09:00" or "09:00:00" to hours and minutes.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':')
  return {
    hours: parseInt(parts[0], 10),
    minutes: parseInt(parts[1], 10),
  }
}

/**
 * Check if current time falls within berater's working hours.
 */
export function isWithinWorkingHours(slots: WorkingHourSlot[], now?: Date): boolean {
  const d = now ?? new Date()
  const dayOfWeek = d.getDay() // 0=Sunday
  const currentMinutes = d.getHours() * 60 + d.getMinutes()

  for (const slot of slots) {
    if (!slot.is_active) continue
    if (slot.day_of_week !== dayOfWeek) continue

    const start = parseTime(slot.start_time)
    const end = parseTime(slot.end_time)
    const startMin = start.hours * 60 + start.minutes
    const endMin = end.hours * 60 + end.minutes

    if (currentMinutes >= startMin && currentMinutes < endMin) {
      return true
    }
  }

  return false
}

/**
 * Get the current matching working hour slot, if any.
 */
function getCurrentSlot(slots: WorkingHourSlot[], now?: Date): WorkingHourSlot | null {
  const d = now ?? new Date()
  const dayOfWeek = d.getDay()
  const currentMinutes = d.getHours() * 60 + d.getMinutes()

  for (const slot of slots) {
    if (!slot.is_active) continue
    if (slot.day_of_week !== dayOfWeek) continue

    const start = parseTime(slot.start_time)
    const end = parseTime(slot.end_time)
    const startMin = start.hours * 60 + start.minutes
    const endMin = end.hours * 60 + end.minutes

    if (currentMinutes >= startMin && currentMinutes < endMin) {
      return slot
    }
  }

  return null
}

/**
 * Get the next time a berater becomes available based on their working hours.
 * Looks up to 7 days ahead.
 */
export function getNextAvailableTime(slots: WorkingHourSlot[], now?: Date): Date | null {
  const d = now ?? new Date()
  const activeSlots = slots.filter((s) => s.is_active)

  if (activeSlots.length === 0) return null

  // Check remaining slots today first, then up to 7 days ahead
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const checkDate = new Date(d)
    checkDate.setDate(checkDate.getDate() + dayOffset)
    const dayOfWeek = checkDate.getDay()

    const daySlots = activeSlots
      .filter((s) => s.day_of_week === dayOfWeek)
      .sort((a, b) => {
        const aMin = parseTime(a.start_time).hours * 60 + parseTime(a.start_time).minutes
        const bMin = parseTime(b.start_time).hours * 60 + parseTime(b.start_time).minutes
        return aMin - bMin
      })

    for (const slot of daySlots) {
      const start = parseTime(slot.start_time)
      const slotStart = new Date(checkDate)
      slotStart.setHours(start.hours, start.minutes, 0, 0)

      // Only consider future times
      if (slotStart > d) {
        return slotStart
      }

      // If today, check if we're before the end of this slot
      if (dayOffset === 0) {
        const end = parseTime(slot.end_time)
        const slotEnd = new Date(checkDate)
        slotEnd.setHours(end.hours, end.minutes, 0, 0)
        if (d < slotEnd) {
          // We're currently within this slot, so already available
          return d
        }
      }
    }
  }

  return null
}

/**
 * Format the next available time as a German label.
 * e.g. "Mo 09:00"
 */
export function formatNextAvailable(date: Date | null): string | null {
  if (!date) return null
  const dayName = DAY_NAMES[date.getDay()]
  const shortDay = dayName.substring(0, 2)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${shortDay} ${hours}:${minutes}`
}

/**
 * Check if a berater is currently available.
 */
export async function getBeraterAvailability(beraterId: string): Promise<BeraterAvailability> {
  const supabaseAdmin = createAdminClient()
  const now = new Date()

  // Load berater data
  const { data: berater, error: beraterError } = await supabaseAdmin
    .from('berater')
    .select('id, status, subscription_status, availability_status, availability_override, availability_override_until, do_not_disturb')
    .eq('id', beraterId)
    .single()

  if (beraterError || !berater) {
    return {
      beraterId,
      status: 'offline',
      isWithinWorkingHours: false,
      hasManualOverride: false,
      nextAvailableAt: null,
      currentSlot: null,
    }
  }

  // Load working hours
  const { data: hours } = await supabaseAdmin
    .from('working_hours')
    .select('day_of_week, start_time, end_time, is_active')
    .eq('berater_id', beraterId)

  const slots: WorkingHourSlot[] = (hours ?? []).map((h) => ({
    day_of_week: h.day_of_week,
    start_time: h.start_time,
    end_time: h.end_time,
    is_active: h.is_active,
  }))

  const withinHours = isWithinWorkingHours(slots, now)
  const currentSlot = getCurrentSlot(slots, now)

  // Check manual override
  let hasOverride = false
  if (berater.availability_override && berater.availability_override_until) {
    const overrideUntil = new Date(berater.availability_override_until)
    if (overrideUntil > now) {
      hasOverride = true
    } else {
      // Override expired, clear it
      await supabaseAdmin
        .from('berater')
        .update({
          availability_override: false,
          availability_override_until: null,
        })
        .eq('id', beraterId)
    }
  }

  // Determine availability
  const isBaseActive = berater.status === 'aktiv' && berater.subscription_status === 'active'
  const isDoNotDisturb = berater.do_not_disturb === true

  let status: BeraterAvailability['status'] = 'offline'

  if (isBaseActive && !isDoNotDisturb && (withinHours || hasOverride)) {
    status = 'available'
  }

  const nextAvailableAt = status === 'available' ? null : getNextAvailableTime(slots, now)

  return {
    beraterId,
    status,
    isWithinWorkingHours: withinHours,
    hasManualOverride: hasOverride,
    nextAvailableAt,
    currentSlot,
  }
}

/**
 * Get all currently available berater.
 */
export async function getAvailableBerater(): Promise<BeraterAvailability[]> {
  const supabaseAdmin = createAdminClient()

  // Load all active berater
  const { data: beraterList } = await supabaseAdmin
    .from('berater')
    .select('id')
    .eq('status', 'aktiv')

  if (!beraterList || beraterList.length === 0) return []

  const results: BeraterAvailability[] = []

  for (const b of beraterList) {
    const availability = await getBeraterAvailability(b.id)
    if (availability.status === 'available') {
      results.push(availability)
    }
  }

  return results
}

/**
 * Update all berater availability statuses (called by cron).
 * Syncs the availability_status column on the berater table.
 */
export async function updateAllAvailability(): Promise<{ updated: number; available: number; offline: number }> {
  const supabaseAdmin = createAdminClient()

  const { data: beraterList } = await supabaseAdmin
    .from('berater')
    .select('id')
    .in('status', ['aktiv', 'pausiert'])

  if (!beraterList || beraterList.length === 0) {
    return { updated: 0, available: 0, offline: 0 }
  }

  let available = 0
  let offline = 0

  for (const b of beraterList) {
    const availability = await getBeraterAvailability(b.id)

    await supabaseAdmin
      .from('berater')
      .update({ availability_status: availability.status })
      .eq('id', b.id)

    if (availability.status === 'available') {
      available++
    } else {
      offline++
    }
  }

  return { updated: beraterList.length, available, offline }
}
