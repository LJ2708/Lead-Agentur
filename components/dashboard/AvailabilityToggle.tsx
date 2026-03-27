"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, Circle, BellOff, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvailabilityData {
  availability_status: string | null
  availability_override: boolean | null
  availability_override_until: string | null
  do_not_disturb: boolean | null
}

interface WorkingHourSlot {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface AvailabilityToggleProps {
  beraterId: string
  compact?: boolean
}

const DAY_NAMES_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

function getNextWorkingSlot(slots: WorkingHourSlot[]): string | null {
  const now = new Date()
  const activeSlots = slots.filter((s) => s.is_active)

  if (activeSlots.length === 0) return null

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const checkDate = new Date(now)
    checkDate.setDate(checkDate.getDate() + dayOffset)
    const dayOfWeek = checkDate.getDay()

    const daySlots = activeSlots
      .filter((s) => s.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    for (const slot of daySlots) {
      const parts = slot.start_time.split(":")
      const slotStart = new Date(checkDate)
      slotStart.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0)

      if (slotStart > now) {
        const dayLabel = DAY_NAMES_SHORT[slotStart.getDay()]
        const time = slot.start_time.substring(0, 5)
        return `${dayLabel} ${time}`
      }
    }
  }

  return null
}

export function AvailabilityToggle({
  beraterId,
  compact = false,
}: AvailabilityToggleProps) {
  const [data, setData] = useState<AvailabilityData | null>(null)
  const [slots, setSlots] = useState<WorkingHourSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const { data: berater } = await supabase
      .from("berater")
      .select(
        "availability_status, availability_override, availability_override_until, do_not_disturb"
      )
      .eq("id", beraterId)
      .single()

    if (berater) {
      setData(berater)
    }

    const { data: hours } = await supabase
      .from("working_hours")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("berater_id", beraterId)

    if (hours) {
      setSlots(
        hours.map((h) => ({
          day_of_week: h.day_of_week,
          start_time: h.start_time.substring(0, 5),
          end_time: h.end_time.substring(0, 5),
          is_active: h.is_active,
        }))
      )
    }

    setIsLoading(false)
  }, [beraterId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isAvailable = data?.availability_status === "available"
  const isDND = data?.do_not_disturb === true

  async function toggleAvailability() {
    setIsToggling(true)
    const supabase = createClient()

    if (isAvailable) {
      // Go offline
      await supabase
        .from("berater")
        .update({
          availability_status: "offline",
          availability_override: false,
          availability_override_until: null,
        })
        .eq("id", beraterId)
    } else {
      // Go available — set override for 4 hours
      const overrideUntil = new Date(
        Date.now() + 4 * 60 * 60 * 1000
      ).toISOString()

      await supabase
        .from("berater")
        .update({
          availability_status: "available",
          availability_override: true,
          availability_override_until: overrideUntil,
          do_not_disturb: false,
        })
        .eq("id", beraterId)
    }

    await fetchData()
    setIsToggling(false)
  }

  async function toggleDND() {
    setIsToggling(true)
    const supabase = createClient()

    const newDND = !isDND
    const updates: Record<string, unknown> = { do_not_disturb: newDND }
    if (newDND) {
      updates.availability_status = "offline"
    }

    await supabase.from("berater").update(updates).eq("id", beraterId)

    await fetchData()
    setIsToggling(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const nextSlot = !isAvailable ? getNextWorkingSlot(slots) : null

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={toggleAvailability}
          disabled={isToggling || isDND}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            isAvailable
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
          )}
        >
          {isToggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Circle
              className={cn(
                "h-2.5 w-2.5",
                isAvailable
                  ? "fill-emerald-500 text-emerald-500"
                  : "fill-gray-400 text-gray-400"
              )}
            />
          )}
          {isAvailable ? "Verfuegbar" : "Offline"}
        </button>

        <button
          onClick={toggleDND}
          disabled={isToggling}
          className={cn(
            "rounded-full p-1 transition-colors",
            isDND
              ? "text-red-500 hover:bg-red-50"
              : "text-gray-400 hover:bg-gray-100"
          )}
          title={isDND ? "Nicht stoeren aktiv" : "Nicht stoeren"}
        >
          {isDND ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle
            className={cn(
              "h-3 w-3",
              isAvailable
                ? "fill-emerald-500 text-emerald-500"
                : isDND
                ? "fill-red-500 text-red-500"
                : "fill-gray-400 text-gray-400"
            )}
          />
          <span className="text-sm font-medium">
            {isAvailable
              ? "Verfuegbar"
              : isDND
              ? "Nicht stoeren"
              : "Offline"}
          </span>
        </div>

        <Button
          variant={isAvailable ? "outline" : "default"}
          size="sm"
          onClick={toggleAvailability}
          disabled={isToggling || isDND}
          className={cn(
            !isAvailable &&
              !isDND &&
              "bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
          )}
        >
          {isToggling ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : null}
          {isAvailable ? "Offline gehen" : "Jetzt verfuegbar"}
        </Button>
      </div>

      {/* Next working slot info */}
      {!isAvailable && nextSlot && (
        <p className="text-xs text-muted-foreground">
          Naechste Arbeitszeit: {nextSlot}
        </p>
      )}

      {/* DND toggle */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          {isDND ? (
            <BellOff className="h-4 w-4 text-red-500" />
          ) : (
            <Bell className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm">Nicht stoeren</span>
        </div>
        <button
          type="button"
          onClick={toggleDND}
          disabled={isToggling}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDND ? "bg-red-500" : "bg-gray-200"
          )}
          role="switch"
          aria-checked={isDND}
          aria-label="Nicht stoeren"
        >
          <span
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
              isDND ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {data.availability_override && data.availability_override_until && (
        <p className="text-xs text-blue-600">
          Manuell verfuegbar bis{" "}
          {new Date(data.availability_override_until).toLocaleTimeString(
            "de-DE",
            { hour: "2-digit", minute: "2-digit" }
          )}
        </p>
      )}
    </div>
  )
}
