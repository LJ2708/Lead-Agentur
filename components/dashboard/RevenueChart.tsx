"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from "recharts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "7d" | "30d" | "90d"

interface DailyRevenue {
  date: string
  revenue: number
  cumulative: number
}

interface RevenueMetrics {
  mrr: number
  arr: number
  churnRate: number
  prevPeriodRevenue: number
  currentPeriodRevenue: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysFromPeriod(period: Period): number {
  switch (period) {
    case "7d":
      return 7
    case "30d":
      return 30
    case "90d":
      return 90
  }
}

function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// ---------------------------------------------------------------------------
// Mini stat card
// ---------------------------------------------------------------------------

function MetricBox({
  label,
  value,
  change,
}: {
  label: string
  value: string
  change?: number
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          {change > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : change < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-500" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
          <span
            className={
              change > 0
                ? "text-green-600"
                : change < 0
                  ? "text-red-500"
                  : "text-muted-foreground"
            }
          >
            {change > 0 ? "+" : ""}
            {change}% gg. Vorperiode
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>("30d")
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<DailyRevenue[]>([])
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    mrr: 0,
    arr: 0,
    churnRate: 0,
    prevPeriodRevenue: 0,
    currentPeriodRevenue: 0,
  })

  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const days = daysFromPeriod(period)

    // Current period
    const currentStart = new Date()
    currentStart.setDate(currentStart.getDate() - days)
    currentStart.setHours(0, 0, 0, 0)

    // Previous period for comparison
    const prevStart = new Date(currentStart)
    prevStart.setDate(prevStart.getDate() - days)

    // Fetch zahlungen for both periods
    const { data: zahlungen } = await supabase
      .from("zahlungen")
      .select("betrag_cents, created_at")
      .gte("created_at", prevStart.toISOString())
      .order("created_at", { ascending: true })

    const allPayments = zahlungen ?? []

    // Split into current and previous
    const currentISO = currentStart.toISOString()
    const currentPayments = allPayments.filter((z) => z.created_at >= currentISO)
    const prevPayments = allPayments.filter((z) => z.created_at < currentISO)

    const currentTotal = currentPayments.reduce((s, z) => s + z.betrag_cents, 0)
    const prevTotal = prevPayments.reduce((s, z) => s + z.betrag_cents, 0)

    // Daily revenue + cumulative
    const byDate: Record<string, number> = {}
    for (const z of currentPayments) {
      const dateKey = new Date(z.created_at).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })
      byDate[dateKey] = (byDate[dateKey] ?? 0) + z.betrag_cents
    }

    // Fill all days in the period
    const dailyData: DailyRevenue[] = []
    let cumulative = 0
    for (let i = 0; i < days; i++) {
      const d = new Date(currentStart)
      d.setDate(d.getDate() + i)
      const dateKey = d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })
      const revenue = byDate[dateKey] ?? 0
      cumulative += revenue
      dailyData.push({ date: dateKey, revenue, cumulative })
    }

    setChartData(dailyData)

    // MRR: from active berater subscriptions (approx: leads_pro_monat * preis_pro_lead_cents)
    const { data: activeBerater } = await supabase
      .from("berater")
      .select("leads_pro_monat, preis_pro_lead_cents, subscription_status")
      .eq("status", "aktiv")

    const beraterList = activeBerater ?? []
    const mrr = beraterList.reduce(
      (s, b) => s + b.leads_pro_monat * b.preis_pro_lead_cents,
      0
    )

    // Churn: canceled / total in the last 30 days
    const { count: totalBerater } = await supabase
      .from("berater")
      .select("id", { count: "exact", head: true })

    const { count: canceledBerater } = await supabase
      .from("berater")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "canceled")

    const total = totalBerater ?? 1
    const canceled = canceledBerater ?? 0
    const churnRate = total > 0 ? Math.round((canceled / total) * 100) : 0

    setMetrics({
      mrr,
      arr: mrr * 12,
      churnRate,
      prevPeriodRevenue: prevTotal,
      currentPeriodRevenue: currentTotal,
    })

    setLoading(false)
  }, [period, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const revenueChange = pctChange(
    metrics.currentPeriodRevenue,
    metrics.prevPeriodRevenue
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Umsatzentwicklung</CardTitle>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p === "7d" ? "7 Tage" : p === "30d" ? "30 Tage" : "90 Tage"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 100)}\u00A0\u20AC`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 100)}\u00A0\u20AC`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                  formatter={(value) => {
                    const num = typeof value === "number" ? value : Number(value)
                    return formatEuroCents(num)
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fill="url(#revGrad)"
                  strokeWidth={2}
                  name="revenue"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                  name="cumulative"
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <MetricBox
                label="MRR"
                value={formatEuroCents(metrics.mrr)}
                change={revenueChange}
              />
              <MetricBox
                label="ARR (geschätzt)"
                value={formatEuroCents(metrics.arr)}
              />
              <MetricBox
                label="Churn Rate"
                value={`${metrics.churnRate}%`}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
