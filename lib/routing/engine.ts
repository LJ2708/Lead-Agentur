import { createAdminClient } from '@/lib/supabase/admin'
import { berechnePacingInfo, maxLeadsHeute } from '@/lib/routing/pacing'
import { getBeraterAvailability } from '@/lib/availability/engine'
import { startOfDay } from 'date-fns'

const supabaseAdmin = createAdminClient()

interface DistributionResult {
  beraterId: string
  isNachkauf: boolean
}

interface BeraterCandidate {
  id: string
  profileId: string
  kontingent: number
  geliefert: number
  leadsHeute: number
  letzteZuweisung: string | null
}

/**
 * Main lead distribution engine.
 * Assigns a lead to the most appropriate berater based on availability, pacing and capacity.
 *
 * Algorithm:
 * 0. Filter by AVAILABILITY first (working hours + override + not DND)
 * 1. Load all active berater (status='aktiv') with subscription info
 * 2. For each berater, calculate pacing score using leads_kontingent
 * 3. Priority order:
 *    PRIO 1: Berater with largest positive pacing difference (most behind)
 *    Tiebreak: Oldest letzte_zuweisung
 *    PRIO 2: Berater with smallest surplus (if all ahead of schedule)
 * 4. No berater available -> set lead to holding queue, return null
 * 5. On assignment:
 *    - Update leads: berater_id, status='zugewiesen', zugewiesen_am=now()
 *    - Set queue_status='assigned', lead_ready_at=now()
 *    - Start SLA: sla_deadline = now() + 30min, sla_status = 'active'
 *    - Increment berater.leads_geliefert
 *    - Create lead_assignments record
 *    - Create lead_activities record
 */
export async function distributeLeadToBerater(
  leadId: string
): Promise<DistributionResult | null> {
  const jetzt = new Date()

  // 1. Load all active berater with kontingent info
  const { data: beraterList, error: beraterError } = await supabaseAdmin
    .from('berater')
    .select('id, profile_id, status, leads_kontingent, leads_geliefert, leads_gesamt, letzte_zuweisung')
    .eq('status', 'aktiv')

  if (beraterError) {
    console.error('[routing] Failed to load berater:', beraterError.message)
    throw new Error(`Failed to load berater: ${beraterError.message}`)
  }

  if (!beraterList || beraterList.length === 0) {
    await setLeadToHolding(leadId, 'Kein Berater verfuegbar')
    return null
  }

  // 2. Filter by availability (working hours + override)
  const availableBeraterIds = new Set<string>()
  for (const b of beraterList) {
    const availability = await getBeraterAvailability(b.id)
    if (availability.status === 'available') {
      availableBeraterIds.add(b.id)
    }
  }

  if (availableBeraterIds.size === 0) {
    await setLeadToHolding(leadId, 'Kein Berater verfuegbar')
    return null
  }

  // 3. Build candidate list with anti-clumping check (only available berater)
  const todayStart = startOfDay(jetzt).toISOString()
  const candidates: BeraterCandidate[] = []

  for (const b of beraterList) {
    // Must be available
    if (!availableBeraterIds.has(b.id)) continue

    // Must not have exceeded leads_gesamt cap
    if (b.leads_geliefert >= b.leads_gesamt) continue

    // Count today's assignments for anti-clumping
    const { count, error: countError } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('berater_id', b.id)
      .gte('zugewiesen_am', todayStart)

    if (countError) {
      console.error(`[routing] Failed to count today's leads for berater ${b.id}:`, countError.message)
      continue
    }

    const leadsHeute = count ?? 0

    // Anti-clumping: use pacing-based cap
    const kontingent = b.leads_kontingent ?? 0
    const dailyCap = maxLeadsHeute(kontingent, jetzt)

    if (leadsHeute >= dailyCap) continue

    candidates.push({
      id: b.id,
      profileId: b.profile_id,
      kontingent,
      geliefert: b.leads_geliefert ?? 0,
      leadsHeute,
      letzteZuweisung: b.letzte_zuweisung ?? null,
    })
  }

  if (candidates.length === 0) {
    await setLeadToHolding(leadId, 'Kein Berater verfuegbar')
    return null
  }

  // 4. Score and sort candidates by pacing
  const scored = candidates.map((c) => {
    const pacing = berechnePacingInfo(c.kontingent, c.geliefert, jetzt)
    return { ...c, pacing, pacingDiff: pacing.differenz }
  })

  // PRIO 1: Berater most behind schedule (largest positive differenz = most under-delivered)
  const behindCandidates = scored
    .filter((c) => c.pacingDiff > 0)
    .sort((a, b) => {
      if (b.pacingDiff !== a.pacingDiff) return b.pacingDiff - a.pacingDiff
      return compareLetzteZuweisung(a.letzteZuweisung, b.letzteZuweisung)
    })

  if (behindCandidates.length > 0) {
    return await assignLead(leadId, behindCandidates[0], false, jetzt)
  }

  // PRIO 2: All ahead or on track - pick one with smallest surplus (closest to schedule)
  const sortedByClosest = scored.sort((a, b) => {
    // differenz is negative when ahead, so largest (closest to 0) = least ahead
    if (a.pacingDiff !== b.pacingDiff) return b.pacingDiff - a.pacingDiff
    return compareLetzteZuweisung(a.letzteZuweisung, b.letzteZuweisung)
  })

  return await assignLead(leadId, sortedByClosest[0], false, jetzt)
}

/**
 * Compare assignment timestamps for tiebreaking.
 * Oldest (or null) gets priority - berater who hasn't been assigned in longest.
 */
function compareLetzteZuweisung(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  return new Date(a).getTime() - new Date(b).getTime()
}

/**
 * Set lead to holding queue when no berater is available.
 * Does NOT start SLA timer.
 */
async function setLeadToHolding(leadId: string, reason: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('leads')
    .update({
      status: 'warteschlange',
      queue_status: 'holding',
      holding_reason: reason,
    })
    .eq('id', leadId)

  if (error) {
    console.error(`[routing] Failed to set lead ${leadId} to holding:`, error.message)
    throw new Error(`Failed to update lead status: ${error.message}`)
  }

  await supabaseAdmin.from('lead_activities').insert({
    lead_id: leadId,
    type: 'status_change',
    title: 'Warteschlange',
    description: `Lead in Warteschlange verschoben - ${reason}`,
  })
}

/**
 * Assign a lead to a berater with all required side effects.
 */
async function assignLead(
  leadId: string,
  candidate: BeraterCandidate & { pacing: ReturnType<typeof berechnePacingInfo> },
  isNachkauf: boolean,
  jetzt: Date
): Promise<DistributionResult> {
  const jetztISO = jetzt.toISOString()

  // SLA: 30 minutes from now
  const slaDeadline = new Date(jetzt.getTime() + 30 * 60 * 1000).toISOString()

  // Update lead record with queue status and SLA
  const { error: leadError } = await supabaseAdmin
    .from('leads')
    .update({
      berater_id: candidate.id,
      status: 'zugewiesen',
      zugewiesen_am: jetztISO,
      queue_status: 'assigned',
      lead_ready_at: jetztISO,
      holding_reason: null,
      sla_deadline: slaDeadline,
      sla_status: 'active',
    })
    .eq('id', leadId)

  if (leadError) {
    console.error(`[routing] Failed to assign lead ${leadId}:`, leadError.message)
    throw new Error(`Failed to assign lead: ${leadError.message}`)
  }

  // Increment berater.leads_geliefert and update letzte_zuweisung
  const { error: beraterError } = await supabaseAdmin
    .from('berater')
    .update({
      leads_geliefert: candidate.geliefert + 1,
      letzte_zuweisung: jetztISO,
    })
    .eq('id', candidate.id)

  if (beraterError) {
    console.error(`[routing] Failed to update berater ${candidate.id}:`, beraterError.message)
  }

  // Create lead_assignments record with pacing snapshot
  const pacingSnapshot = {
    kontingent: candidate.pacing.kontingent,
    geliefert: candidate.pacing.geliefert,
    sollBisJetzt: candidate.pacing.sollBisJetzt,
    differenz: candidate.pacing.differenz,
    status: candidate.pacing.status,
    prozent: candidate.pacing.prozent,
    is_nachkauf: isNachkauf,
  }

  await supabaseAdmin.from('lead_assignments').insert({
    lead_id: leadId,
    berater_id: candidate.id,
    pacing_snapshot: pacingSnapshot,
    reason: isNachkauf ? 'nachkauf' : 'pacing_distribution',
    is_active: true,
  })

  // Create lead_activities record
  await supabaseAdmin.from('lead_activities').insert({
    lead_id: leadId,
    type: 'zuweisung',
    title: 'Zuweisung',
    description: isNachkauf
      ? 'Lead als Nachkauf an Berater zugewiesen'
      : `Lead an Berater zugewiesen (Pacing: ${candidate.pacing.status}, ${candidate.pacing.prozent}%)`,
  })

  // After assigning to berater, check if berater uses pool setter
  await maybeAssignPoolSetter(leadId, candidate.id)

  return {
    beraterId: candidate.id,
    isNachkauf,
  }
}

/**
 * If the berater has setter_typ='pool', assign a setter from the pool.
 * Uses round-robin: picks the setter with fewest active leads.
 */
async function maybeAssignPoolSetter(
  leadId: string,
  beraterId: string
): Promise<void> {
  // Check if berater uses pool setter
  const { data: berater } = await supabaseAdmin
    .from('berater')
    .select('setter_typ')
    .eq('id', beraterId)
    .single()

  if (!berater || berater.setter_typ !== 'pool') return

  // Fetch max_kontaktversuche from pricing_config
  let maxKontaktversuche = 5
  const { data: configData } = await supabaseAdmin
    .from('pricing_config')
    .select('value')
    .eq('key', 'max_kontaktversuche')
    .single()

  if (configData) {
    maxKontaktversuche = configData.value
  }

  // Fetch all setter profiles
  const { data: setterProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'setter')

  if (!setterProfiles || setterProfiles.length === 0) {
    console.warn('[routing] No setter profiles found for pool assignment')
    return
  }

  // Round-robin: pick setter with fewest active leads
  let bestSetter: { id: string; full_name: string } | null = null
  let minActiveLeads = Infinity

  for (const setter of setterProfiles) {
    const { count } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('setter_id', setter.id)
      .not('status', 'in', '("abschluss","verloren")')

    const activeCount = count ?? 0
    if (activeCount < minActiveLeads) {
      minActiveLeads = activeCount
      bestSetter = setter
    }
  }

  if (!bestSetter) return

  // Assign setter to lead
  const { error: updateError } = await supabaseAdmin
    .from('leads')
    .update({
      setter_id: bestSetter.id,
      max_kontaktversuche: maxKontaktversuche,
    })
    .eq('id', leadId)

  if (updateError) {
    console.error(`[routing] Failed to assign setter to lead ${leadId}:`, updateError.message)
    return
  }

  // Create activity
  await supabaseAdmin.from('lead_activities').insert({
    lead_id: leadId,
    type: 'zuweisung',
    title: 'Setter zugewiesen',
    description: `Setter zugewiesen: ${bestSetter.full_name}`,
  })
}
