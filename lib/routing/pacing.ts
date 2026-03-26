import { getDaysInMonth, differenceInDays, startOfMonth } from 'date-fns'

export interface PacingInfo {
  kontingent: number
  geliefert: number
  sollBisJetzt: number
  differenz: number
  status: 'on_track' | 'behind' | 'ahead'
  prozent: number
}

/**
 * Calculate expected leads delivered by now based on kontingent and day of month.
 * Distributes leads evenly across all days of the current month.
 */
export function berechneSollLeads(kontingent: number, jetzt: Date = new Date()): number {
  const monatsTage = getDaysInMonth(jetzt)
  const monatsStart = startOfMonth(jetzt)
  // +1 because we include today (day 1 = first day of month should already have some)
  const vergangene = differenceInDays(jetzt, monatsStart) + 1

  const sollProTag = kontingent / monatsTage
  return Math.round(sollProTag * vergangene)
}

/**
 * Anti-clumping: max leads that can be delivered today.
 * Capped at 2x the daily average to prevent lead dumping.
 */
export function maxLeadsHeute(kontingent: number, jetzt: Date = new Date()): number {
  const monatsTage = getDaysInMonth(jetzt)
  const tagesschnitt = kontingent / monatsTage
  return Math.ceil(tagesschnitt * 2)
}

/**
 * Determine pacing status based on expected vs actual delivery.
 * Tolerance of 10% of soll before flagging behind/ahead.
 */
export function getPacingStatus(soll: number, ist: number): 'on_track' | 'behind' | 'ahead' {
  if (soll === 0) {
    return ist === 0 ? 'on_track' : 'ahead'
  }

  const toleranz = Math.max(1, Math.round(soll * 0.1))

  if (ist < soll - toleranz) return 'behind'
  if (ist > soll + toleranz) return 'ahead'
  return 'on_track'
}

/**
 * Full pacing info for a berater.
 * Returns kontingent, delivered count, expected count, difference, status, and percentage.
 */
export function berechnePacingInfo(
  kontingent: number,
  geliefert: number,
  jetzt: Date = new Date()
): PacingInfo {
  const sollBisJetzt = berechneSollLeads(kontingent, jetzt)
  const differenz = sollBisJetzt - geliefert // positive = behind schedule
  const status = getPacingStatus(sollBisJetzt, geliefert)
  const prozent = kontingent > 0 ? Math.round((geliefert / kontingent) * 100) : 0

  return {
    kontingent,
    geliefert,
    sollBisJetzt,
    differenz,
    status,
    prozent,
  }
}
