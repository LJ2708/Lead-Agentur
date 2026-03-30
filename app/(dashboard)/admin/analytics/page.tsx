"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { BeraterHeatmap } from "@/components/dashboard/BeraterHeatmap"
import { LeadMapPlaceholder } from "@/components/dashboard/LeadMapPlaceholder"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "7d" | "30d" | "90d" | "all"
type BeraterToggle = "absolut" | "prozentual"
type BeraterPeriod = "heute" | "woche" | "monat"

interface FunnelStep {
  label: string
  status: string
  count: number
  color: string
}

interface BeraterComparison {
  name: string
  contactRate: number
  appointmentRate: number
  closeRate: number
  contactCount: number
  appointmentCount: number
  closeCount: number
  totalLeads: number
}

interface SourceData {
  source: string
  label: string
  count: number
  conversionRate: number
}

interface DailyLeadData {
  date: string
  count: number
}

interface HourlyData {
  hour: string
  count: number
}

interface AdPerformance {
  name: string
  total: number
  kontaktiert: number
  termin: number
  abschluss: number
  verloren: number
  kontaktiertPct: number
  terminPct: number
  abschlussPct: number
  verlorenPct: number
  conversionRate: number
}

type AdSortKey = "name" | "total" | "kontaktiertPct" | "terminPct" | "abschlussPct" | "verlorenPct" | "conversionRate"

interface TimeToContactData {
  date: string
  minutes: number
}

interface SlaComplianceData {
  date: string
  rate: number
}

interface BeraterSla {
  name: string
  avgMinutes: number
  breachCount: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUNNEL_STAGES: { label: string; status: string; color: string }[] = [
  { label: "Neu", status: "neu", color: "#3B82F6" },
  { label: "Zugewiesen", status: "zugewiesen", color: "#6366F1" },
  { label: "Kontaktversuch", status: "kontaktversuch", color: "#8B5CF6" },
  { label: "Qualifiziert", status: "qualifiziert", color: "#06B6D4" },
  { label: "Termin", status: "termin", color: "#14B8A6" },
  { label: "Show", status: "show", color: "#10B981" },
  { label: "Abschluss", status: "abschluss", color: "#22C55E" },
]

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: "Meta Lead Ad",
  landingpage: "Landingpage",
  manuell: "Manuell",
  import: "Import",
}

const PIE_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#6B7280"]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysFromPeriod(period: Period): number {
  switch (period) {
    case "7d": return 7
    case "30d": return 30
    case "90d": return 90
    case "all": return 3650
  }
}

function periodDate(period: Period): string | null {
  if (period === "all") return null
  const d = new Date()
  d.setDate(d.getDate() - daysFromPeriod(period))
  return d.toISOString()
}

const AD_FUNNEL_COLORS = ["#3B82F6", "#8B5CF6", "#14B8A6", "#22C55E"]

// Deterministic mapping from lead status to a funnel stage index (-1 if not in funnel)
const STATUS_TO_FUNNEL_INDEX: Record<string, number> = {}
FUNNEL_STAGES.forEach((s, i) => { STATUS_TO_FUNNEL_INDEX[s.status] = i })
// Statuses that imply they passed through earlier stages
const PROGRESSIVE_STATUSES: Record<string, number> = {
  neu: 0,
  zugewiesen: 1,
  kontaktversuch: 2,
  nicht_erreicht: 2,
  qualifiziert: 3,
  termin: 4,
  show: 5,
  no_show: 5,
  nachfassen: 3,
  abschluss: 6,
  verloren: 1,
  warteschlange: 0,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d")
  const [loading, setLoading] = useState(true)

  // Section 1: Funnel
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([])

  // Section 2: Berater
  const [beraterData, setBeraterData] = useState<BeraterComparison[]>([])
  const [beraterToggle, setBeraterToggle] = useState<BeraterToggle>("prozentual")
  const [beraterPeriod, setBeraterPeriod] = useState<BeraterPeriod>("monat")

  // Section 3: Source
  const [sourceDistribution, setSourceDistribution] = useState<SourceData[]>([])

  // Section 4: Time
  const [dailyLeads, setDailyLeads] = useState<DailyLeadData[]>([])
  const [hourlyLeads, setHourlyLeads] = useState<HourlyData[]>([])
  const [timeToContact, setTimeToContact] = useState<TimeToContactData[]>([])

  // Section 5: SLA
  const [slaCompliance, setSlaCompliance] = useState<SlaComplianceData[]>([])
  const [avgAcceptTime, setAvgAcceptTime] = useState(0)
  const [breachesPerWeek, setBreachesPerWeek] = useState(0)
  const [beraterSla, setBeraterSla] = useState<BeraterSla[]>([])

  // Section 6: Werbeanzeigen
  const [adPerformance, setAdPerformance] = useState<AdPerformance[]>([])
  const [adSortKey, setAdSortKey] = useState<AdSortKey>("total")
  const [adSortDir, setAdSortDir] = useState<"asc" | "desc">("desc")

  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const since = periodDate(period)

    // Fetch leads
    let leadsQuery = supabase
      .from("leads")
      .select("id, status, source, berater_id, created_at, zugewiesen_am, erster_kontakt_am, termin_am, abschluss_am, sla_deadline, sla_status, accepted_at, campaign")
      .order("created_at", { ascending: true })
    if (since) {
      leadsQuery = leadsQuery.gte("created_at", since)
    }
    const { data: leads } = await leadsQuery

    // Fetch berater with profiles
    const { data: beraterList } = await supabase
      .from("berater")
      .select("id, profile_id, profiles:profile_id(full_name)")
      .eq("status", "aktiv")

    const beraterNameMap: Record<string, string> = {}
    if (beraterList) {
      for (const b of beraterList) {
        const profile = b.profiles as unknown as { full_name: string | null } | null
        beraterNameMap[b.id] = profile?.full_name ?? "Unbekannt"
      }
    }

    if (leads && leads.length > 0) {
      // ---- Section 1: Funnel ----
      const funnelCounts = FUNNEL_STAGES.map(() => 0)
      for (const lead of leads) {
        const maxStage = PROGRESSIVE_STATUSES[lead.status]
        if (maxStage !== undefined) {
          for (let i = 0; i <= maxStage; i++) {
            funnelCounts[i]++
          }
        }
      }
      setFunnelData(
        FUNNEL_STAGES.map((stage, i) => ({
          label: stage.label,
          status: stage.status,
          count: funnelCounts[i],
          color: stage.color,
        }))
      )

      // ---- Section 2: Berater Comparison ----
      const beraterPeriodDate = new Date()
      if (beraterPeriod === "heute") {
        beraterPeriodDate.setHours(0, 0, 0, 0)
      } else if (beraterPeriod === "woche") {
        beraterPeriodDate.setDate(beraterPeriodDate.getDate() - 7)
      } else {
        beraterPeriodDate.setDate(beraterPeriodDate.getDate() - 30)
      }
      const beraterPeriodISO = beraterPeriodDate.toISOString()

      const beraterStats: Record<string, { total: number; contacted: number; appointment: number; closed: number }> = {}
      for (const lead of leads) {
        if (!lead.berater_id) continue
        if (new Date(lead.created_at).toISOString() < beraterPeriodISO) continue

        if (!beraterStats[lead.berater_id]) {
          beraterStats[lead.berater_id] = { total: 0, contacted: 0, appointment: 0, closed: 0 }
        }
        const s = beraterStats[lead.berater_id]
        s.total++
        const stage = PROGRESSIVE_STATUSES[lead.status]
        if (stage !== undefined && stage >= 2) s.contacted++
        if (stage !== undefined && stage >= 4) s.appointment++
        if (stage !== undefined && stage >= 6) s.closed++
      }

      const comparisons: BeraterComparison[] = Object.entries(beraterStats).map(([id, s]) => ({
        name: beraterNameMap[id] ?? "Unbekannt",
        contactRate: s.total > 0 ? Math.round((s.contacted / s.total) * 100) : 0,
        appointmentRate: s.total > 0 ? Math.round((s.appointment / s.total) * 100) : 0,
        closeRate: s.total > 0 ? Math.round((s.closed / s.total) * 100) : 0,
        contactCount: s.contacted,
        appointmentCount: s.appointment,
        closeCount: s.closed,
        totalLeads: s.total,
      }))
      setBeraterData(comparisons)

      // ---- Section 3: Source Analysis ----
      const bySource: Record<string, { total: number; closed: number }> = {}
      for (const lead of leads) {
        const src = lead.source ?? "manuell"
        if (!bySource[src]) bySource[src] = { total: 0, closed: 0 }
        bySource[src].total++
        if (lead.status === "abschluss") bySource[src].closed++
      }
      setSourceDistribution(
        Object.entries(bySource).map(([source, d]) => ({
          source,
          label: SOURCE_LABELS[source] ?? source,
          count: d.total,
          conversionRate: d.total > 0 ? Math.round((d.closed / d.total) * 100) : 0,
        }))
      )

      // ---- Section 4: Time Analysis ----
      // Daily leads
      const byDate: Record<string, number> = {}
      for (const lead of leads) {
        const date = new Date(lead.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
        byDate[date] = (byDate[date] ?? 0) + 1
      }
      setDailyLeads(Object.entries(byDate).map(([date, count]) => ({ date, count })))

      // Hourly
      const byHour: Record<number, number> = {}
      for (const lead of leads) {
        const hour = new Date(lead.created_at).getHours()
        byHour[hour] = (byHour[hour] ?? 0) + 1
      }
      setHourlyLeads(
        Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}:00`,
          count: byHour[i] ?? 0,
        }))
      )

      // Time to first contact
      const contactByDate: Record<string, { total: number; count: number }> = {}
      for (const lead of leads) {
        if (lead.zugewiesen_am && lead.erster_kontakt_am) {
          const assigned = new Date(lead.zugewiesen_am).getTime()
          const contacted = new Date(lead.erster_kontakt_am).getTime()
          const diffMin = Math.round((contacted - assigned) / 60000)
          if (diffMin >= 0 && diffMin < 1440) {
            const date = new Date(lead.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
            if (!contactByDate[date]) contactByDate[date] = { total: 0, count: 0 }
            contactByDate[date].total += diffMin
            contactByDate[date].count++
          }
        }
      }
      setTimeToContact(
        Object.entries(contactByDate).map(([date, d]) => ({
          date,
          minutes: d.count > 0 ? Math.round(d.total / d.count) : 0,
        }))
      )

      // ---- Section 5: SLA ----
      // SLA compliance by date
      const slaByDate: Record<string, { total: number; ok: number }> = {}
      let totalAcceptTime = 0
      let acceptCount = 0
      let totalBreaches = 0

      for (const lead of leads) {
        if (lead.sla_status) {
          const date = new Date(lead.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
          if (!slaByDate[date]) slaByDate[date] = { total: 0, ok: 0 }
          slaByDate[date].total++
          if (lead.sla_status !== "breached") {
            slaByDate[date].ok++
          } else {
            totalBreaches++
          }
        }
        if (lead.accepted_at && lead.zugewiesen_am) {
          const diff = new Date(lead.accepted_at).getTime() - new Date(lead.zugewiesen_am).getTime()
          const diffMin = Math.round(diff / 60000)
          if (diffMin >= 0 && diffMin < 1440) {
            totalAcceptTime += diffMin
            acceptCount++
          }
        }
      }

      setSlaCompliance(
        Object.entries(slaByDate).map(([date, d]) => ({
          date,
          rate: d.total > 0 ? Math.round((d.ok / d.total) * 100) : 100,
        }))
      )
      setAvgAcceptTime(acceptCount > 0 ? Math.round(totalAcceptTime / acceptCount) : 0)
      const weeks = Math.max(1, daysFromPeriod(period) / 7)
      setBreachesPerWeek(Math.round(totalBreaches / weeks))

      // Berater SLA performance
      const beraterSlaMap: Record<string, { totalMin: number; count: number; breaches: number }> = {}
      for (const lead of leads) {
        if (!lead.berater_id) continue
        if (!beraterSlaMap[lead.berater_id]) {
          beraterSlaMap[lead.berater_id] = { totalMin: 0, count: 0, breaches: 0 }
        }
        if (lead.accepted_at && lead.zugewiesen_am) {
          const diff = Math.round((new Date(lead.accepted_at).getTime() - new Date(lead.zugewiesen_am).getTime()) / 60000)
          if (diff >= 0 && diff < 1440) {
            beraterSlaMap[lead.berater_id].totalMin += diff
            beraterSlaMap[lead.berater_id].count++
          }
        }
        if (lead.sla_status === "breached") {
          beraterSlaMap[lead.berater_id].breaches++
        }
      }
      setBeraterSla(
        Object.entries(beraterSlaMap)
          .map(([id, d]) => ({
            name: beraterNameMap[id] ?? "Unbekannt",
            avgMinutes: d.count > 0 ? Math.round(d.totalMin / d.count) : 0,
            breachCount: d.breaches,
          }))
          .sort((a, b) => a.avgMinutes - b.avgMinutes)
      )

      // ---- Section 6: Werbeanzeigen-Performance ----
      const byCampaign: Record<string, { total: number; kontaktiert: number; termin: number; abschluss: number; verloren: number }> = {}
      for (const lead of leads) {
        const camp = lead.campaign
        if (!camp) continue
        if (!byCampaign[camp]) byCampaign[camp] = { total: 0, kontaktiert: 0, termin: 0, abschluss: 0, verloren: 0 }
        const s = byCampaign[camp]
        s.total++
        const stage = PROGRESSIVE_STATUSES[lead.status]
        if (stage !== undefined && stage >= 2) s.kontaktiert++
        if (stage !== undefined && stage >= 4) s.termin++
        if (stage !== undefined && stage >= 6) s.abschluss++
        if (lead.status === "verloren") s.verloren++
      }
      setAdPerformance(
        Object.entries(byCampaign).map(([name, d]) => ({
          name,
          total: d.total,
          kontaktiert: d.kontaktiert,
          termin: d.termin,
          abschluss: d.abschluss,
          verloren: d.verloren,
          kontaktiertPct: d.total > 0 ? Math.round((d.kontaktiert / d.total) * 100) : 0,
          terminPct: d.total > 0 ? Math.round((d.termin / d.total) * 100) : 0,
          abschlussPct: d.total > 0 ? Math.round((d.abschluss / d.total) * 100) : 0,
          verlorenPct: d.total > 0 ? Math.round((d.verloren / d.total) * 100) : 0,
          conversionRate: d.total > 0 ? Math.round(((d.termin + d.abschluss) / d.total) * 100) : 0,
        }))
      )
    } else {
      setFunnelData([])
      setBeraterData([])
      setSourceDistribution([])
      setDailyLeads([])
      setHourlyLeads([])
      setTimeToContact([])
      setSlaCompliance([])
      setAvgAcceptTime(0)
      setBreachesPerWeek(0)
      setBeraterSla([])
      setAdPerformance([])
    }

    setLoading(false)
  }, [period, beraterPeriod, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Max count for funnel width scaling
  const funnelMax = funnelData.length > 0 ? Math.max(...funnelData.map((s) => s.count), 1) : 1

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Erweiterte Auswertungen und Conversion-Analysen.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["7d", "30d", "90d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p === "7d" ? "7 Tage" : p === "30d" ? "30 Tage" : p === "90d" ? "90 Tage" : "Gesamt"}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            Fortschritt der Leads durch die Vertriebsphasen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : funnelData.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">Keine Daten vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {funnelData.map((step, i) => {
                const widthPct = Math.max(10, (step.count / funnelMax) * 100)
                const prevCount = i > 0 ? funnelData[i - 1].count : step.count
                const dropOff = prevCount > 0 && i > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0
                const conversionFromPrev = prevCount > 0 && i > 0 ? Math.round((step.count / prevCount) * 100) : 100

                return (
                  <div key={step.status} className="flex items-center gap-4">
                    <div className="w-32 shrink-0 text-right text-sm font-medium">
                      {step.label}
                    </div>
                    <div className="flex-1">
                      <div
                        className="flex h-10 items-center justify-between rounded-md px-3 text-sm font-semibold text-white transition-all"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: step.color,
                          minWidth: "80px",
                        }}
                      >
                        <span>{step.count}</span>
                        {i > 0 && (
                          <span className="text-xs font-normal opacity-90">
                            {conversionFromPrev}% Conversion
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-24 shrink-0 text-sm text-muted-foreground">
                      {i > 0 ? (
                        <span className="text-red-500">-{dropOff}% Drop</span>
                      ) : (
                        <span>Start</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Berater Comparison */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Berater-Vergleich</CardTitle>
              <CardDescription>Kontaktrate, Terminrate, Abschlussrate pro Berater</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-1 rounded-lg border border-border p-1">
                {(["absolut", "prozentual"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBeraterToggle(t)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      beraterToggle === t ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "absolut" ? "Absolut" : "Prozentual"}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border border-border p-1">
                {(["heute", "woche", "monat"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setBeraterPeriod(p)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      beraterPeriod === p ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p === "heute" ? "Heute" : p === "woche" ? "Woche" : "Monat"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : beraterData.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">Keine Berater-Daten vorhanden.</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={beraterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  unit={beraterToggle === "prozentual" ? "%" : ""}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                />
                <Legend />
                <Bar
                  dataKey={beraterToggle === "prozentual" ? "contactRate" : "contactCount"}
                  name="Kontaktrate"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={beraterToggle === "prozentual" ? "appointmentRate" : "appointmentCount"}
                  name="Terminrate"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={beraterToggle === "prozentual" ? "closeRate" : "closeCount"}
                  name="Abschlussrate"
                  fill="#22C55E"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Lead Source Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads nach Quelle</CardTitle>
            <CardDescription>Verteilung der Lead-Quellen</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : sourceDistribution.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">Keine Daten vorhanden.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                    label={({ label, percent }: { label?: string; percent?: number }) =>
                      `${label ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine
                  >
                    {sourceDistribution.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion nach Quelle</CardTitle>
            <CardDescription>Welche Quelle liefert die besten Leads?</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : sourceDistribution.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">Keine Daten vorhanden.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sourceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                    <Bar dataKey="conversionRate" name="Abschlussrate" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {(() => {
                  const best = [...sourceDistribution].sort((a, b) => b.conversionRate - a.conversionRate)[0]
                  return best ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Beste Quelle: <Badge variant="secondary">{best.label}</Badge> mit {best.conversionRate}% Abschlussrate
                    </p>
                  ) : null
                })()}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Time Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads pro Tag</CardTitle>
            <CardDescription>Eingehende Leads im Zeitverlauf</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : dailyLeads.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">Keine Daten vorhanden.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyLeads}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  <Line type="monotone" dataKey="count" name="Leads" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads nach Tageszeit</CardTitle>
            <CardDescription>Wann kommen die meisten Leads rein?</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : hourlyLeads.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">Keine Daten vorhanden.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyLeads}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  <Bar dataKey="count" name="Leads" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Durchschnittliche Zeit bis zum ersten Kontakt</CardTitle>
          <CardDescription>In Minuten, pro Tag</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : timeToContact.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">Keine Kontaktzeit-Daten vorhanden.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeToContact}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} unit=" Min." />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                <Line type="monotone" dataKey="minutes" name="Min. bis Kontakt" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Section 5: SLA Dashboard */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Durchschn. Annahmezeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? "-" : `${avgAcceptTime} Min.`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SLA-Verletzungen / Woche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? "-" : breachesPerWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SLA-Compliance (Gesamt)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading
                ? "-"
                : slaCompliance.length > 0
                  ? `${Math.round(slaCompliance.reduce((a, b) => a + b.rate, 0) / slaCompliance.length)}%`
                  : "100%"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA-Compliance im Zeitverlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : slaCompliance.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">Keine SLA-Daten vorhanden.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={slaCompliance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                <Line type="monotone" dataKey="rate" name="SLA-Compliance" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SLA-Performance nach Berater</CardTitle>
          <CardDescription>Durchschnittliche Annahmezeit und SLA-Verletzungen</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : beraterSla.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">Keine SLA-Berater-Daten vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Berater</th>
                    <th className="py-2 text-right font-medium">Durchschn. Annahme</th>
                    <th className="py-2 text-right font-medium">SLA-Verletzungen</th>
                    <th className="py-2 text-right font-medium">Bewertung</th>
                  </tr>
                </thead>
                <tbody>
                  {beraterSla.map((b, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{b.name}</td>
                      <td className="py-2 text-right">{b.avgMinutes} Min.</td>
                      <td className="py-2 text-right">{b.breachCount}</td>
                      <td className="py-2 text-right">
                        {i === 0 && beraterSla.length > 1 ? (
                          <Badge className="bg-green-100 text-green-700">Bester</Badge>
                        ) : i === beraterSla.length - 1 && beraterSla.length > 1 ? (
                          <Badge className="bg-red-100 text-red-700">Schlechtester</Badge>
                        ) : (
                          <Badge variant="secondary">Mittel</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Werbeanzeigen-Performance */}
      {(() => {
        const sortedAds = [...adPerformance].sort((a, b) => {
          const aVal = a[adSortKey]
          const bVal = b[adSortKey]
          if (typeof aVal === "string" && typeof bVal === "string") {
            return adSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
          }
          return adSortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
        })
        const barData = [...adPerformance].sort((a, b) => b.total - a.total)
        const bestAd = [...adPerformance].sort((a, b) => b.conversionRate - a.conversionRate)[0]
        const worstAd = [...adPerformance].sort((a, b) => b.verlorenPct - a.verlorenPct)[0]
        const top5 = barData.slice(0, 5)
        const funnelStages = ["Neu", "Kontakt", "Termin", "Abschluss"] as const
        const toggleSort = (key: AdSortKey) => {
          if (adSortKey === key) {
            setAdSortDir(adSortDir === "asc" ? "desc" : "asc")
          } else {
            setAdSortKey(key)
            setAdSortDir("desc")
          }
        }
        const sortIndicator = (key: AdSortKey) => adSortKey === key ? (adSortDir === "asc" ? " \u2191" : " \u2193") : ""
        const cellColor = (pct: number, invert?: boolean) => {
          if (invert) {
            if (pct >= 40) return "bg-red-100 text-red-800"
            if (pct >= 20) return "bg-yellow-100 text-yellow-800"
            return "bg-green-100 text-green-800"
          }
          if (pct >= 40) return "bg-green-100 text-green-800"
          if (pct >= 20) return "bg-yellow-100 text-yellow-800"
          return "bg-red-100 text-red-800"
        }
        const barColor = (convRate: number) => {
          if (convRate >= 40) return "#22C55E"
          if (convRate >= 20) return "#F59E0B"
          return "#EF4444"
        }

        return (
          <>
            {/* Summary cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Anzahl Werbeanzeigen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{loading ? "-" : adPerformance.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Beste Anzeige
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-3xl font-bold">-</p>
                  ) : bestAd ? (
                    <div>
                      <p className="truncate text-lg font-bold" title={bestAd.name}>{bestAd.name}</p>
                      <p className="text-sm text-green-600">{bestAd.conversionRate}% Conversion</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Keine Daten</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Schlechteste Anzeige
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-3xl font-bold">-</p>
                  ) : worstAd ? (
                    <div>
                      <p className="truncate text-lg font-bold" title={worstAd.name}>{worstAd.name}</p>
                      <p className="text-sm text-red-600">{worstAd.verlorenPct}% Verloren</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Keine Daten</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bar chart: Leads pro Werbeanzeige */}
            <Card>
              <CardHeader>
                <CardTitle>Leads pro Werbeanzeige</CardTitle>
                <CardDescription>Horizontale Balken, sortiert nach Anzahl, eingefärbt nach Conversion-Rate</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : barData.length === 0 ? (
                  <p className="py-16 text-center text-muted-foreground">Keine Werbeanzeigen-Daten vorhanden.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 40)}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} width={200} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                        formatter={(value: unknown) => [
                          `${value} Leads`,
                          "Leads",
                        ]}
                      />
                      <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={barColor(entry.conversionRate)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
              <CardHeader>
                <CardTitle>Performance pro Anzeige</CardTitle>
                <CardDescription>Klicke auf Spaltenüberschriften zum Sortieren</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : sortedAds.length === 0 ? (
                  <p className="py-16 text-center text-muted-foreground">Keine Werbeanzeigen-Daten vorhanden.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="cursor-pointer py-2 text-left font-medium hover:text-blue-600" onClick={() => toggleSort("name")}>
                            Werbeanzeige{sortIndicator("name")}
                          </th>
                          <th className="cursor-pointer py-2 text-right font-medium hover:text-blue-600" onClick={() => toggleSort("total")}>
                            Leads{sortIndicator("total")}
                          </th>
                          <th className="cursor-pointer py-2 text-right font-medium hover:text-blue-600" onClick={() => toggleSort("kontaktiertPct")}>
                            Kontaktiert{sortIndicator("kontaktiertPct")}
                          </th>
                          <th className="cursor-pointer py-2 text-right font-medium hover:text-blue-600" onClick={() => toggleSort("terminPct")}>
                            Termin{sortIndicator("terminPct")}
                          </th>
                          <th className="cursor-pointer py-2 text-right font-medium hover:text-blue-600" onClick={() => toggleSort("abschlussPct")}>
                            Abschluss{sortIndicator("abschlussPct")}
                          </th>
                          <th className="cursor-pointer py-2 text-right font-medium hover:text-blue-600" onClick={() => toggleSort("verlorenPct")}>
                            Verloren{sortIndicator("verlorenPct")}
                          </th>
                          <th className="cursor-pointer py-2 text-right font-medium hover:text-blue-600" onClick={() => toggleSort("conversionRate")}>
                            Conversion{sortIndicator("conversionRate")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAds.map((ad, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="max-w-[250px] truncate py-2 font-medium" title={ad.name}>{ad.name}</td>
                            <td className="py-2 text-right">{ad.total}</td>
                            <td className="py-2 text-right">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cellColor(ad.kontaktiertPct)}`}>
                                {ad.kontaktiertPct}%
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cellColor(ad.terminPct)}`}>
                                {ad.terminPct}%
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cellColor(ad.abschlussPct)}`}>
                                {ad.abschlussPct}%
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cellColor(ad.verlorenPct, true)}`}>
                                {ad.verlorenPct}%
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cellColor(ad.conversionRate)}`}>
                                {ad.conversionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Funnel per Top 5 Anzeigen */}
            <Card>
              <CardHeader>
                <CardTitle>Funnel der Top-5-Anzeigen</CardTitle>
                <CardDescription>Neu &rarr; Kontakt &rarr; Termin &rarr; Abschluss pro Werbeanzeige</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : top5.length === 0 ? (
                  <p className="py-16 text-center text-muted-foreground">Keine Werbeanzeigen-Daten vorhanden.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={funnelStages.map((stage) => {
                        const row: Record<string, string | number> = { stage }
                        for (const ad of top5) {
                          const val =
                            stage === "Neu" ? ad.total
                            : stage === "Kontakt" ? ad.kontaktiert
                            : stage === "Termin" ? ad.termin
                            : ad.abschluss
                          row[ad.name] = val
                        }
                        return row
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="stage" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      {top5.map((ad, i) => (
                        <Bar key={ad.name} dataKey={ad.name} fill={AD_FUNNEL_COLORS[i % AD_FUNNEL_COLORS.length]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )
      })()}

      {/* Section 7: Berater Activity Heatmap */}
      <BeraterHeatmap />

      {/* Section 8: Lead-Verteilung (Placeholder) */}
      <LeadMapPlaceholder />
    </div>
  )
}
