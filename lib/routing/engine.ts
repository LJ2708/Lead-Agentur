import { createAdminClient } from '@/lib/supabase/admin'
import { berechnePacingInfo, maxLeadsHeute } from '@/lib/routing/pacing'
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
 * Assigns a lead to the most appropriate berater based on pacing and capacity.
 *
 * Algorithm:
 * 1. Load all active berater (status='aktiv') with subscription info
 * 2. For each berater, calculate pacing score using leads_kontingent
 * 3. Priority order:
 *    PRIO 1: Berater with largest positive pacing difference (most behind)
 *    Tiebreak: Oldest letzte_zuweisung
 *    PRIO 2: Berater with smallest surplus (if all ahead of schedule)
 * 4. No berater available -> set lead status to 'warteschlange', return null
 * 5. On assignment:
 *    - Update leads: berater_id, status='zugewiesen', zugewiesen_am=now()
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
    await setLeadToWarteschlange(leadId)
    return null
  }

  // 2. Build candidate list with anti-clumping check
  const todayStart = startOfDay(jetzt).toISOString()
  const candidates: BeraterCandidate[] = []

  for (const b of beraterList) {
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
    await setLeadToWarteschlange(leadId)
    return null
  }

  // 3. Score and sort candidates by pacing
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
 * Set lead status to warteschlange when no berater is available.
 */
async function setLeadToWarteschlange(leadId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('leads')
    .update({ status: 'warteschlange' })
    .eq('id', leadId)

  if (error) {
    console.error(`[routing] Failed to set lead ${leadId} to warteschlange:`, error.message)
    throw new Error(`Failed to update lead status: ${error.message}`)
  }

  await supabaseAdmin.from('lead_activities').insert({
    lead_id: leadId,
    type: 'status_change',
    title: 'Warteschlange',
    description: 'Lead in Warteschlange verschoben - kein Berater verfuegbar',
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

  // Update lead record
  const { error: leadError } = await supabaseAdmin
    .from('leads')
    .update({
      berater_id: candidate.id,
      status: 'zugewiesen',
      zugewiesen_am: jetztISO,
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

  return {
    beraterId: candidate.id,
    isNachkauf,
  }
}
