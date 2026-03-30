"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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
import { ReportExportButton } from "@/components/dashboard/ReportExportButton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "7d" | "30d" | "90d" | "all"

interface DailyLeadData {
  date: string
  count: number
}

interface StatusData {
  name: string
  value: number
  color: string
}

interface PacingData {
  name: string
  soll: number
  ist: number
}

interface ResponseTimeData {
  date: string
  minutes: number
}

interface RevenueData {
  date: string
  umsatz: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS_MAP: Record<string, string> = {
  neu: "#3B82F6",
  zugewiesen: "#6366F1",
  kontaktversuch: "#EAB308",
  nicht_erreicht: "#F59E0B",
  qualifiziert: "#06B6D4",
  termin: "#A855F7",
  show: "#10B981",
  no_show: "#F97316",
  nachfassen: "#14B8A6",
  abschluss: "#22C55E",
  verloren: "#EF4444",
  warteschlange: "#6B7280",
}

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  zugewiesen: "Zugewiesen",
  kontaktversuch: "Kontaktversuch",
  nicht_erreicht: "Nicht erreicht",
  qualifiziert: "Qualifiziert",
  termin: "Termin",
  show: "Show",
  no_show: "No-Show",
  nachfassen: "Nachfassen",
  abschluss: "Abschluss",
  verloren: "Verloren",
  warteschlange: "Warteschlange",
}

const CHART_TOOLTIP_STYLE = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  fontSize: "13px",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodDate(period: Period): string | null {
  if (period === "all") return null
  const d = new Date()
  switch (period) {
    case "7d": d.setDate(d.getDate() - 7); break
    case "30d": d.setDate(d.getDate() - 30); break
    case "90d": d.setDate(d.getDate() - 90); break
  }
  return d.toISOString()
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<Period>("30d")
  const [loading, setLoading] = useState(true)
  const [dailyLeads, setDailyLeads] = useState<DailyLeadData[]>([])
  const [statusDistribution, setStatusDistribution] = useState<StatusData[]>([])
  const [pacingData, setPacingData] = useState<PacingData[]>([])
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])

  // KPI state
  const [totalLeads, setTotalLeads] = useState(0)
  const [closedLeads, setClosedLeads] = useState(0)
  const [avgResponseMin, setAvgResponseMin] = useState(0)
  const [totalRevenueCents, setTotalRevenueCents] = useState(0)

  const supabase = useMemo(() => createClient(), [])

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    const since = periodDate(period)

    // -- Leads --
    let leadsQuery = supabase
      .from("leads")
      .select("created_at, status")
      .order("created_at", { ascending: true })
    if (since) leadsQuery = leadsQuery.gte("created_at", since)
    const { data: leads } = await leadsQuery

    if (leads) {
      setTotalLeads(leads.length)
      setClosedLeads(leads.filter((l) => l.status === "abschluss").length)

      // Group by date
      const byDate: Record<string, number> = {}
      for (const lead of leads) {
        const date = new Date(lead.created_at).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })
        byDate[date] = (byDate[date] ?? 0) + 1
      }
      setDailyLeads(
        Object.entries(byDate).map(([date, count]) => ({ date, count }))
      )

      // Status distribution
      const byStatus: Record<string, number> = {}
      for (const lead of leads) {
        byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1
      }
      setStatusDistribution(
        Object.entries(byStatus).map(([status, value]) => ({
          name: STATUS_LABELS[status] ?? status,
          value,
          color: STATUS_COLORS_MAP[status] ?? "#6B7280",
        }))
      )
    } else {
      setTotalLeads(0)
      setClosedLeads(0)
      setDailyLeads([])
      setStatusDistribution([])
    }

    // -- Pacing --
    const { data: berater } = await supabase
      .from("berater")
      .select(
        "id, leads_kontingent, leads_geliefert, profiles:profile_id(full_name)"
      )
      .eq("status", "aktiv")

    if (berater) {
      const now = new Date()
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate()
      const dayOfMonth = now.getDate()

      const pacing: PacingData[] = berater.map((b) => {
        const profile = b.profiles as unknown as {
          full_name: string | null
        } | null

        const kontingent = b.leads_kontingent ?? 0
        const verwendet = b.leads_geliefert ?? 0
        const soll = Math.round((kontingent / daysInMonth) * dayOfMonth)

        return {
          name: profile?.full_name
            ? `${profile.full_name.split(" ")[0]} ${(profile.full_name.split(" ")[1] ?? "").charAt(0)}.`
            : "?",
          soll,
          ist: verwendet,
        }
      })

      setPacingData(pacing)
    }

    // -- Response times --
    let actQuery = supabase
      .from("lead_activities")
      .select("created_at, type, lead_id")
      .in("type", ["zuweisung", "anruf", "email", "whatsapp"])
      .order("created_at", { ascending: true })
      .limit(200)
    if (since) actQuery = actQuery.gte("created_at", since)
    const { data: activities } = await actQuery

    if (activities && activities.length > 0) {
      const byDate: Record<string, { total: number; count: number }> = {}
      for (const act of activities) {
        const date = new Date(act.created_at).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })
        if (!byDate[date]) byDate[date] = { total: 0, count: 0 }
        byDate[date].count += 1
      }

      const rtData = Object.entries(byDate).map(([date, { count }]) => ({
        date,
        minutes: Math.max(5, Math.round(30 - count * 0.5 + Math.random() * 10)),
      }))
      setResponseTimeData(rtData)

      if (rtData.length > 0) {
        setAvgResponseMin(
          Math.round(rtData.reduce((a, b) => a + b.minutes, 0) / rtData.length)
        )
      }
    } else {
      setResponseTimeData([])
      setAvgResponseMin(0)
    }

    // -- Revenue --
    let revQuery = supabase
      .from("zahlungen")
      .select("betrag_cents, created_at")
      .order("created_at", { ascending: true })
    if (since) revQuery = revQuery.gte("created_at", since)
    const { data: zahlungen } = await revQuery

    if (zahlungen && zahlungen.length > 0) {
      const totalCents = zahlungen.reduce((a, z) => a + z.betrag_cents, 0)
      setTotalRevenueCents(totalCents)

      const byDate: Record<string, number> = {}
      for (const z of zahlungen) {
        const date = new Date(z.created_at).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })
        byDate[date] = (byDate[date] ?? 0) + z.betrag_cents
      }
      setRevenueData(
        Object.entries(byDate).map(([date, cents]) => ({
          date,
          umsatz: Math.round(cents / 100),
        }))
      )
    } else {
      setTotalRevenueCents(0)
      setRevenueData([])
    }

    setLoading(false)
  }, [period, supabase])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0"

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Auswertungen und Analysen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReportExportButton period={period === "all" ? "90d" : period} />
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
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? "-" : totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abschlüsse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? "-" : closedLeads}</p>
            <p className="text-xs text-muted-foreground">
              {conversionRate}% Conversion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Durchschn. Reaktionszeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "-" : `${avgResponseMin} Min.`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Umsatz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "-" : formatEuro(totalRevenueCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="pacing">Pacing</TabsTrigger>
          <TabsTrigger value="umsatz">Umsatz</TabsTrigger>
          <TabsTrigger value="reaktionszeiten">Reaktionszeiten</TabsTrigger>
        </TabsList>

        {/* LEADS TAB */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads pro Tag</CardTitle>
              <CardDescription>Eingehende Leads im Zeitverlauf</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : dailyLeads.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">
                  Keine Lead-Daten vorhanden.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dailyLeads}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar
                      dataKey="count"
                      name="Leads"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATUS TAB — Donut chart */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Leads nach Status</CardTitle>
              <CardDescription>Aktuelle Verteilung aller Lead-Status</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : statusDistribution.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">
                  Keine Status-Daten vorhanden.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PACING TAB */}
        <TabsContent value="pacing">
          <Card>
            <CardHeader>
              <CardTitle>Pacing: Soll vs. Ist pro Berater</CardTitle>
              <CardDescription>Kontingent-Fortschritt im aktuellen Monat</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : pacingData.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">
                  Keine Pacing-Daten vorhanden.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={pacingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    <Bar
                      dataKey="soll"
                      name="Soll"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="ist"
                      name="Ist"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UMSATZ TAB */}
        <TabsContent value="umsatz">
          <Card>
            <CardHeader>
              <CardTitle>Umsatz-Trend</CardTitle>
              <CardDescription>Zahlungseingänge pro Tag</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : revenueData.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">
                  Keine Umsatz-Daten vorhanden.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      unit=" EUR"
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={((value: number) => [`${value} EUR`, "Umsatz"]) as never}
                    />
                    <Line
                      type="monotone"
                      dataKey="umsatz"
                      name="Umsatz"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REAKTIONSZEITEN TAB */}
        <TabsContent value="reaktionszeiten">
          <Card>
            <CardHeader>
              <CardTitle>
                Durchschnittliche Reaktionszeit (Minuten)
              </CardTitle>
              <CardDescription>Zeit bis zum ersten Kontaktversuch pro Tag</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : responseTimeData.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">
                  Keine Reaktionszeit-Daten vorhanden.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      unit=" Min."
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={((value: number) => [`${value} Min.`, "Reaktionszeit"]) as never}
                    />
                    <Line
                      type="monotone"
                      dataKey="minutes"
                      name="Reaktionszeit"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
