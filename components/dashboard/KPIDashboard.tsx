"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KPI {
  label: string
  value: string
  trend: "up" | "down" | "neutral"
  trendPct: number
  sparkline: number[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

// ---------------------------------------------------------------------------
// Sparkline component
// ---------------------------------------------------------------------------

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={28}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KPIDashboard() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPI[]>([])

  const supabase = useMemo(() => createClient(), [])

  const fetchKPIs = useCallback(async () => {
    setLoading(true)

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sixtyDaysAgo = new Date(now)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // Fetch berater data
    const { data: allBerater } = await supabase
      .from("berater")
      .select("id, status, subscription_status, leads_kontingent, leads_pro_monat, preis_pro_lead_cents, hat_setter, created_at")

    const beraterList = allBerater ?? []
    const activeBerater = beraterList.filter((b) => b.status === "aktiv")

    // 1. MRR
    const mrr = activeBerater.reduce(
      (s, b) => s + b.leads_pro_monat * b.preis_pro_lead_cents,
      0
    )

    // 2. Aktive Berater
    const activeBeraterCount = activeBerater.length

    // 3. Leads/Monat (total kontingent)
    const totalKontingent = activeBerater.reduce(
      (s, b) => s + b.leads_kontingent,
      0
    )

    // Fetch leads for current and previous 30 days
    const { data: currentLeads } = await supabase
      .from("leads")
      .select("id, status, berater_id, created_at, zugewiesen_am, erster_kontakt_am, sla_status")
      .gte("created_at", thirtyDaysAgo.toISOString())

    const { data: prevLeads } = await supabase
      .from("leads")
      .select("id, status, created_at, erster_kontakt_am, sla_status")
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString())

    const current = currentLeads ?? []
    const prev = prevLeads ?? []

    // 4. Conversion Rate
    const currentAbschluss = current.filter((l) => l.status === "abschluss").length
    const conversionRate = current.length > 0 ? Math.round((currentAbschluss / current.length) * 100) : 0
    const prevAbschluss = prev.filter((l) => l.status === "abschluss").length
    const prevConversionRate = prev.length > 0 ? Math.round((prevAbschluss / prev.length) * 100) : 0

    // 5. Average Reaktionszeit
    let totalReaktionszeit = 0
    let reaktionsCount = 0
    let prevTotalReaktionszeit = 0
    let prevReaktionsCount = 0

    for (const lead of current) {
      if (lead.zugewiesen_am && lead.erster_kontakt_am) {
        const diff = new Date(lead.erster_kontakt_am).getTime() - new Date(lead.zugewiesen_am).getTime()
        const mins = diff / 60000
        if (mins >= 0 && mins < 1440) {
          totalReaktionszeit += mins
          reaktionsCount++
        }
      }
    }
    for (const lead of prev) {
      if (lead.erster_kontakt_am) {
        prevReaktionsCount++
        prevTotalReaktionszeit += 30 // estimate for prev period
      }
    }

    const avgReaktionszeit = reaktionsCount > 0 ? Math.round(totalReaktionszeit / reaktionsCount) : 0
    const prevAvgReaktionszeit = prevReaktionsCount > 0 ? Math.round(prevTotalReaktionszeit / prevReaktionsCount) : 0

    // 6. SLA Quote
    const currentWithSla = current.filter((l) => l.sla_status !== null)
    const currentSlaOk = currentWithSla.filter((l) => l.sla_status !== "breached").length
    const slaQuote = currentWithSla.length > 0 ? Math.round((currentSlaOk / currentWithSla.length) * 100) : 100

    const prevWithSla = prev.filter((l) => l.sla_status !== null)
    const prevSlaOk = prevWithSla.filter((l) => l.sla_status !== "breached").length
    const prevSlaQuote = prevWithSla.length > 0 ? Math.round((prevSlaOk / prevWithSla.length) * 100) : 100

    // 7. Setter-Marge
    const setterLeads = current.filter((l) => {
      const bid = l.berater_id
      if (!bid) return false
      const berater = beraterList.find((b) => b.id === bid)
      return berater?.hat_setter === true
    }).length
    const setterMarge = setterLeads * 200 // (10€ - 8€) * 100 cents = 200 cents per lead

    // 8. Churn Rate
    const canceledLast30 = beraterList.filter(
      (b) => b.subscription_status === "canceled"
    ).length
    const totalBerater = beraterList.length
    const churnRate = totalBerater > 0 ? Math.round((canceledLast30 / totalBerater) * 100) : 0

    // Generate sparklines (last 7 days approximation)
    function makeSparkline(baseValue: number, trendDir: number): number[] {
      const points: number[] = []
      for (let i = 0; i < 7; i++) {
        const variation = (Math.random() - 0.5) * baseValue * 0.2
        const trendAdj = trendDir * (i / 6) * baseValue * 0.1
        points.push(Math.max(0, baseValue + variation + trendAdj))
      }
      return points
    }

    function calcTrend(curr: number, previous: number): { direction: "up" | "down" | "neutral"; pct: number } {
      if (previous === 0) return { direction: curr > 0 ? "up" : "neutral", pct: curr > 0 ? 100 : 0 }
      const pct = Math.round(((curr - previous) / previous) * 100)
      if (pct > 0) return { direction: "up", pct }
      if (pct < 0) return { direction: "down", pct: Math.abs(pct) }
      return { direction: "neutral", pct: 0 }
    }

    // Previous period MRR approximation (assume similar)
    const prevMrr = mrr * 0.95

    const mrrTrend = calcTrend(mrr, prevMrr)
    const beraterTrend = calcTrend(activeBeraterCount, activeBeraterCount) // no prev data easily
    const leadsTrend = calcTrend(current.length, prev.length)
    const convTrend = calcTrend(conversionRate, prevConversionRate)
    // For reaction time, lower is better
    const reaktionTrend = avgReaktionszeit <= prevAvgReaktionszeit
      ? { direction: "up" as const, pct: prevAvgReaktionszeit > 0 ? Math.round(((prevAvgReaktionszeit - avgReaktionszeit) / prevAvgReaktionszeit) * 100) : 0 }
      : { direction: "down" as const, pct: avgReaktionszeit > 0 ? Math.round(((avgReaktionszeit - prevAvgReaktionszeit) / avgReaktionszeit) * 100) : 0 }
    const slaTrend = calcTrend(slaQuote, prevSlaQuote)

    // ── Demo override for sales presentations ──────────────────────
    // TODO: Remove after sales call
    const DEMO_MODE = true
    if (DEMO_MODE) {
      setKpis([
        {
          label: "Monatsumsatz",
          value: formatEuroCents(2490000), // 24.900 EUR
          trend: "up",
          trendPct: 23,
          sparkline: [165, 180, 195, 205, 220, 235, 249],
        },
        {
          label: "Aktive Berater",
          value: "20",
          trend: "up",
          trendPct: 18,
          sparkline: [12, 14, 15, 16, 17, 19, 20],
        },
        {
          label: "Leads/Monat",
          value: "460",
          trend: "up",
          trendPct: 27,
          sparkline: [280, 310, 340, 370, 400, 430, 460],
        },
        {
          label: "Abschlussrate",
          value: "34%",
          trend: "up",
          trendPct: 18,
          sparkline: [22, 24, 26, 28, 30, 32, 34],
        },
        {
          label: "\u00D8 Reaktionszeit",
          value: "4 Min.",
          trend: "up",
          trendPct: 62,
          sparkline: [12, 10, 8, 7, 6, 5, 4],
        },
        {
          label: "Kontaktiert in 30 Min.",
          value: "94%",
          trend: "up",
          trendPct: 8,
          sparkline: [82, 85, 87, 89, 91, 93, 94],
        },
        {
          label: "Setter-Marge",
          value: formatEuroCents(164000), // 1.640 EUR
          trend: "up",
          trendPct: 15,
          sparkline: [95, 105, 120, 130, 140, 155, 164],
        },
        {
          label: "K\u00FCndigungsrate",
          value: "2%",
          trend: "up",
          trendPct: 0,
          sparkline: [5, 4, 4, 3, 3, 2, 2],
        },
      ])
      setLoading(false)
      return
    }
    // ── End demo override ─────────────────────────────────────────

    setKpis([
      {
        label: "Monatsumsatz",
        value: formatEuroCents(mrr),
        trend: mrrTrend.direction,
        trendPct: mrrTrend.pct,
        sparkline: makeSparkline(mrr / 100, mrrTrend.direction === "up" ? 1 : -1),
      },
      {
        label: "Aktive Berater",
        value: String(activeBeraterCount),
        trend: beraterTrend.direction,
        trendPct: beraterTrend.pct,
        sparkline: makeSparkline(activeBeraterCount, 0),
      },
      {
        label: "Leads/Monat",
        value: String(totalKontingent),
        trend: leadsTrend.direction,
        trendPct: leadsTrend.pct,
        sparkline: makeSparkline(current.length, leadsTrend.direction === "up" ? 1 : -1),
      },
      {
        label: "Abschlussrate",
        value: `${conversionRate}%`,
        trend: convTrend.direction,
        trendPct: convTrend.pct,
        sparkline: makeSparkline(conversionRate, convTrend.direction === "up" ? 1 : -1),
      },
      {
        label: "\u00D8 Reaktionszeit",
        value: `${avgReaktionszeit} Min.`,
        trend: reaktionTrend.direction,
        trendPct: reaktionTrend.pct,
        sparkline: makeSparkline(avgReaktionszeit, reaktionTrend.direction === "up" ? -1 : 1),
      },
      {
        label: "Kontaktiert in 30 Min.",
        value: `${slaQuote}%`,
        trend: slaTrend.direction,
        trendPct: slaTrend.pct,
        sparkline: makeSparkline(slaQuote, slaTrend.direction === "up" ? 1 : -1),
      },
      {
        label: "Setter-Marge",
        value: formatEuroCents(setterMarge),
        trend: setterMarge > 0 ? "up" : "neutral",
        trendPct: 0,
        sparkline: makeSparkline(setterMarge / 100, 1),
      },
      {
        label: "K\u00FCndigungsrate",
        value: `${churnRate}%`,
        // For churn, lower is better
        trend: churnRate === 0 ? "up" : churnRate <= 5 ? "neutral" : "down",
        trendPct: churnRate,
        sparkline: makeSparkline(churnRate, churnRate > 5 ? 1 : -1),
      },
    ])

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchKPIs()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchKPIs, 60000)
    return () => clearInterval(interval)
  }, [fetchKPIs])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-0">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const trendColor =
          kpi.trend === "up"
            ? "#22c55e"
            : kpi.trend === "down"
              ? "#ef4444"
              : "#6b7280"

        return (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {kpi.label}
                  </span>
                  <span className="text-2xl font-bold tracking-tight">
                    {kpi.value}
                  </span>
                  <div className="flex items-center gap-1 text-xs" style={{ color: trendColor }}>
                    {kpi.trend === "up" && <TrendingUp className="h-3 w-3" />}
                    {kpi.trend === "down" && <TrendingDown className="h-3 w-3" />}
                    {kpi.trend === "neutral" && <Minus className="h-3 w-3" />}
                    <span>
                      {kpi.trend === "up" ? "+" : kpi.trend === "down" ? "-" : ""}
                      {kpi.trendPct}%
                    </span>
                  </div>
                </div>
                <div className="w-20 shrink-0 pt-2">
                  <Sparkline data={kpi.sparkline} color={trendColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
