import { createAdminClient } from "@/lib/supabase/admin"

export interface ScoreBreakdown {
  speed: number       // 0-25 (fast accept + fast contact)
  reliability: number // 0-25 (SLA compliance)
  effectiveness: number // 0-25 (contact + qualification rate)
  results: number     // 0-25 (appointments + closes)
}

export interface RepPerformance {
  beraterId: string
  beraterName: string
  period: "today" | "week" | "month"

  // Speed metrics
  avgTimeToAccept: number | null      // seconds
  avgTimeToFirstContact: number | null // seconds

  // SLA metrics
  totalLeadsAssigned: number
  leadsWithinSla: number
  slaRate: number              // 0-100%

  // Contact metrics
  totalContactAttempts: number
  contactRate: number          // % of leads contacted

  // Conversion metrics
  leadsQualified: number
  qualificationRate: number    // %
  appointmentsSet: number
  appointmentRate: number      // %
  closedDeals: number
  closeRate: number            // %

  // Revenue
  totalRevenueCents: number

  // Overall score (0-100)
  overallScore: number
  scoreBreakdown: ScoreBreakdown

  // Rank
  rank: number | null
  totalReps: number | null

  // Trend
  trend: "up" | "down" | "stable"
  previousScore: number | null
}

type Period = "today" | "week" | "month"

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  let start: Date

  switch (period) {
    case "today": {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
      break
    }
    case "week": {
      start = new Date(now)
      const day = start.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday as start
      start.setDate(start.getDate() - diff)
      start.setHours(0, 0, 0, 0)
      break
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    }
  }

  return { start, end }
}

function getPreviousPeriodRange(period: Period): { start: Date; end: Date } {
  const current = getPeriodRange(period)

  switch (period) {
    case "today": {
      const start = new Date(current.start)
      start.setDate(start.getDate() - 1)
      const end = new Date(current.start)
      end.setMilliseconds(-1)
      return { start, end }
    }
    case "week": {
      const start = new Date(current.start)
      start.setDate(start.getDate() - 7)
      const end = new Date(current.start)
      end.setMilliseconds(-1)
      return { start, end }
    }
    case "month": {
      const start = new Date(current.start)
      start.setMonth(start.getMonth() - 1)
      const end = new Date(current.start)
      end.setMilliseconds(-1)
      return { start, end }
    }
  }
}

function calcSpeedScore(avgAccept: number | null, avgContact: number | null): number {
  let acceptScore = 3
  if (avgAccept !== null) {
    if (avgAccept < 60) acceptScore = 12.5
    else if (avgAccept < 120) acceptScore = 10
    else if (avgAccept < 300) acceptScore = 7
    else acceptScore = 3
  }

  let contactScore = 3
  if (avgContact !== null) {
    if (avgContact < 300) contactScore = 12.5
    else if (avgContact < 900) contactScore = 10
    else if (avgContact < 1800) contactScore = 7
    else contactScore = 3
  }

  return acceptScore + contactScore
}

function calcReliabilityScore(slaRate: number): number {
  if (slaRate >= 95) return 25
  if (slaRate >= 80) return 20
  if (slaRate >= 60) return 15
  return 5
}

function calcEffectivenessScore(contactRate: number, qualificationRate: number): number {
  let cScore = 3
  if (contactRate >= 80) cScore = 12.5
  else if (contactRate >= 60) cScore = 10
  else if (contactRate >= 40) cScore = 7

  let qScore = 3
  if (qualificationRate >= 50) qScore = 12.5
  else if (qualificationRate >= 30) qScore = 10
  else if (qualificationRate >= 15) qScore = 7

  return cScore + qScore
}

function calcResultsScore(appointmentRate: number, closeRate: number): number {
  let aScore = 3
  if (appointmentRate >= 30) aScore = 12.5
  else if (appointmentRate >= 20) aScore = 10
  else if (appointmentRate >= 10) aScore = 7

  let cScore = 3
  if (closeRate >= 20) cScore = 12.5
  else if (closeRate >= 10) cScore = 10
  else if (closeRate >= 5) cScore = 7

  return aScore + cScore
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function diffSeconds(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (isNaN(ta) || isNaN(tb)) return null
  return Math.abs(tb - ta) / 1000
}

async function fetchMetrics(
  beraterId: string,
  periodStart: string,
  periodEnd: string
): Promise<{
  avgTimeToAccept: number | null
  avgTimeToFirstContact: number | null
  totalLeadsAssigned: number
  leadsWithinSla: number
  slaRate: number
  totalContactAttempts: number
  contactRate: number
  leadsQualified: number
  qualificationRate: number
  appointmentsSet: number
  appointmentRate: number
  closedDeals: number
  closeRate: number
  totalRevenueCents: number
}> {
  const supabase = createAdminClient()

  // Fetch leads assigned to this berater in the period
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("berater_id", beraterId)
    .gte("zugewiesen_am", periodStart)
    .lte("zugewiesen_am", periodEnd)

  const allLeads = leads ?? []
  const totalLeadsAssigned = allLeads.length

  if (totalLeadsAssigned === 0) {
    return {
      avgTimeToAccept: null,
      avgTimeToFirstContact: null,
      totalLeadsAssigned: 0,
      leadsWithinSla: 0,
      slaRate: 0,
      totalContactAttempts: 0,
      contactRate: 0,
      leadsQualified: 0,
      qualificationRate: 0,
      appointmentsSet: 0,
      appointmentRate: 0,
      closedDeals: 0,
      closeRate: 0,
      totalRevenueCents: 0,
    }
  }

  // Time to accept: accepted_at - zugewiesen_am
  const acceptTimes: number[] = []
  for (const lead of allLeads) {
    const diff = diffSeconds(lead.zugewiesen_am, lead.accepted_at)
    if (diff !== null) acceptTimes.push(diff)
  }
  const avgTimeToAccept =
    acceptTimes.length > 0
      ? acceptTimes.reduce((a, b) => a + b, 0) / acceptTimes.length
      : null

  // Time to first contact: first_contact_at - zugewiesen_am
  const contactTimes: number[] = []
  for (const lead of allLeads) {
    const diff = diffSeconds(lead.zugewiesen_am, lead.first_contact_at)
    if (diff !== null) contactTimes.push(diff)
  }
  const avgTimeToFirstContact =
    contactTimes.length > 0
      ? contactTimes.reduce((a, b) => a + b, 0) / contactTimes.length
      : null

  // SLA metrics
  const leadsWithinSla = allLeads.filter(
    (l) => l.sla_status === "within_sla" || l.sla_status === "met"
  ).length
  const slaRate = totalLeadsAssigned > 0
    ? (leadsWithinSla / totalLeadsAssigned) * 100
    : 0

  // Contact metrics
  const totalContactAttempts = allLeads.reduce(
    (sum, l) => sum + (l.kontaktversuche ?? 0),
    0
  )
  const leadsContacted = allLeads.filter(
    (l) => (l.kontaktversuche ?? 0) > 0 || l.first_contact_at !== null
  ).length
  const contactRate = totalLeadsAssigned > 0
    ? (leadsContacted / totalLeadsAssigned) * 100
    : 0

  // Conversion metrics
  const qualifiedStatuses = [
    "qualifiziert",
    "termin",
    "show",
    "abschluss",
  ]
  const leadsQualified = allLeads.filter((l) =>
    qualifiedStatuses.includes(l.status)
  ).length
  const qualificationRate = totalLeadsAssigned > 0
    ? (leadsQualified / totalLeadsAssigned) * 100
    : 0

  const appointmentStatuses = ["termin", "show", "abschluss"]
  const appointmentsSet = allLeads.filter((l) =>
    appointmentStatuses.includes(l.status)
  ).length
  const appointmentRate = totalLeadsAssigned > 0
    ? (appointmentsSet / totalLeadsAssigned) * 100
    : 0

  const closedDeals = allLeads.filter((l) => l.status === "abschluss").length
  const closeRate = totalLeadsAssigned > 0
    ? (closedDeals / totalLeadsAssigned) * 100
    : 0

  // Revenue - sum from berater record for the period
  // Get actual revenue from zahlungen in period
  const { data: zahlungen } = await supabase
    .from("zahlungen")
    .select("betrag_cents")
    .eq("berater_id", beraterId)
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd)

  const revenue = (zahlungen ?? []).reduce(
    (sum, z) => sum + (z.betrag_cents ?? 0),
    0
  )

  return {
    avgTimeToAccept,
    avgTimeToFirstContact,
    totalLeadsAssigned,
    leadsWithinSla,
    slaRate,
    totalContactAttempts,
    contactRate,
    leadsQualified,
    qualificationRate,
    appointmentsSet,
    appointmentRate,
    closedDeals,
    closeRate,
    totalRevenueCents: revenue,
  }
}

export async function calculateRepPerformance(
  beraterId: string,
  period: Period
): Promise<RepPerformance> {
  const supabase = createAdminClient()

  // Get berater name
  const { data: berater } = await supabase
    .from("berater")
    .select("id, profile_id, profiles(full_name)")
    .eq("id", beraterId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData = berater?.profiles as any
  const beraterName = profileData?.full_name ?? "Unbekannt"

  const { start, end } = getPeriodRange(period)
  const periodStart = start.toISOString()
  const periodEnd = end.toISOString()

  const metrics = await fetchMetrics(beraterId, periodStart, periodEnd)

  // Calculate score breakdown
  const speed = calcSpeedScore(metrics.avgTimeToAccept, metrics.avgTimeToFirstContact)
  const reliability = calcReliabilityScore(metrics.slaRate)
  const effectiveness = calcEffectivenessScore(metrics.contactRate, metrics.qualificationRate)
  const results = calcResultsScore(metrics.appointmentRate, metrics.closeRate)

  const overallScore = Math.round(speed + reliability + effectiveness + results)

  // Trend: compare to previous period
  const prevRange = getPreviousPeriodRange(period)
  const prevMetrics = await fetchMetrics(
    beraterId,
    prevRange.start.toISOString(),
    prevRange.end.toISOString()
  )

  const prevSpeed = calcSpeedScore(prevMetrics.avgTimeToAccept, prevMetrics.avgTimeToFirstContact)
  const prevReliability = calcReliabilityScore(prevMetrics.slaRate)
  const prevEffectiveness = calcEffectivenessScore(
    prevMetrics.contactRate,
    prevMetrics.qualificationRate
  )
  const prevResults = calcResultsScore(prevMetrics.appointmentRate, prevMetrics.closeRate)
  const previousScore = Math.round(prevSpeed + prevReliability + prevEffectiveness + prevResults)

  let trend: "up" | "down" | "stable" = "stable"
  if (overallScore > previousScore + 2) trend = "up"
  else if (overallScore < previousScore - 2) trend = "down"

  return {
    beraterId,
    beraterName,
    period,
    avgTimeToAccept: metrics.avgTimeToAccept,
    avgTimeToFirstContact: metrics.avgTimeToFirstContact,
    totalLeadsAssigned: metrics.totalLeadsAssigned,
    leadsWithinSla: metrics.leadsWithinSla,
    slaRate: Math.round(metrics.slaRate * 10) / 10,
    totalContactAttempts: metrics.totalContactAttempts,
    contactRate: Math.round(metrics.contactRate * 10) / 10,
    leadsQualified: metrics.leadsQualified,
    qualificationRate: Math.round(metrics.qualificationRate * 10) / 10,
    appointmentsSet: metrics.appointmentsSet,
    appointmentRate: Math.round(metrics.appointmentRate * 10) / 10,
    closedDeals: metrics.closedDeals,
    closeRate: Math.round(metrics.closeRate * 10) / 10,
    totalRevenueCents: metrics.totalRevenueCents,
    overallScore,
    scoreBreakdown: {
      speed: Math.round(speed * 10) / 10,
      reliability: Math.round(reliability * 10) / 10,
      effectiveness: Math.round(effectiveness * 10) / 10,
      results: Math.round(results * 10) / 10,
    },
    rank: null,
    totalReps: null,
    trend,
    previousScore,
  }
}

export async function calculateLeaderboard(
  period: Period
): Promise<RepPerformance[]> {
  const supabase = createAdminClient()

  // Fetch all active berater
  const { data: beraterList } = await supabase
    .from("berater")
    .select("id")
    .eq("status", "aktiv")

  if (!beraterList || beraterList.length === 0) return []

  // Calculate performance for each berater
  const performances = await Promise.all(
    beraterList.map((b) => calculateRepPerformance(b.id, period))
  )

  // Sort by overallScore descending
  performances.sort((a, b) => b.overallScore - a.overallScore)

  // Assign ranks
  const totalReps = performances.length
  performances.forEach((p, i) => {
    p.rank = i + 1
    p.totalReps = totalReps
  })

  return performances
}
