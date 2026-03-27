"use client"

import { useState, useEffect, useCallback } from "react"
import { formatEuro } from "@/lib/utils"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { Leaderboard } from "@/components/dashboard/Leaderboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trophy,
  ShieldCheck,
  Phone,
  Euro,
  AlertTriangle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import type { RepPerformance } from "@/lib/performance/scoring"

type Period = "today" | "week" | "month"

export default function AdminPerformancePage() {
  const [period, setPeriod] = useState<Period>("week")
  const [data, setData] = useState<RepPerformance[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/performance/leaderboard?period=${period}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Silently handle error
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // Aggregate stats
  const avgScore =
    data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.overallScore, 0) / data.length)
      : 0

  const bestSla =
    data.length > 0 ? Math.max(...data.map((d) => d.slaRate)) : 0

  const avgContactRate =
    data.length > 0
      ? Math.round(
          (data.reduce((s, d) => s + d.contactRate, 0) / data.length) * 10
        ) / 10
      : 0

  const totalRevenue = data.reduce((s, d) => s + d.totalRevenueCents, 0)

  // Chart data
  const scoreChartData = data.map((d) => ({
    name: d.beraterName.split(" ")[0] ?? d.beraterName,
    score: d.overallScore,
    speed: d.scoreBreakdown.speed,
    reliability: d.scoreBreakdown.reliability,
    effectiveness: d.scoreBreakdown.effectiveness,
    results: d.scoreBreakdown.results,
  }))

  const slaChartData = data.map((d) => ({
    name: d.beraterName.split(" ")[0] ?? d.beraterName,
    sla: d.slaRate,
  }))

  const contactChartData = data.map((d) => ({
    name: d.beraterName.split(" ")[0] ?? d.beraterName,
    kontaktrate: d.contactRate,
  }))

  // Worst performers
  const worstPerformers = data.filter((d) => d.overallScore < 40)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Team Performance
          </h1>
          <p className="text-muted-foreground">
            {"\u00dc"}berblick {"\u00fc"}ber die Leistung aller Berater
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="today">Heute</TabsTrigger>
            <TabsTrigger value="week">Woche</TabsTrigger>
            <TabsTrigger value="month">Monat</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading && data.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={"\u00d8 Team-Score"}
              value={avgScore}
              description="Durchschnittlicher Performance-Score"
              icon={Trophy}
            />
            <StatsCard
              title="Beste SLA-Quote"
              value={`${bestSla}%`}
              description="H\u00f6chste SLA-Einhaltung"
              icon={ShieldCheck}
            />
            <StatsCard
              title={"\u00d8 Kontaktrate"}
              value={`${avgContactRate}%`}
              description="Durchschnittliche Kontaktrate"
              icon={Phone}
            />
            <StatsCard
              title="Umsatz gesamt"
              value={formatEuro(totalRevenue)}
              description="Im ausgew\u00e4hlten Zeitraum"
              icon={Euro}
            />
          </div>

          {/* Worst Performers Alert */}
          {worstPerformers.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Achtung: {worstPerformers.length} Berater mit Score unter 40
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {worstPerformers
                      .map((p) => `${p.beraterName} (${p.overallScore})`)
                      .join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard */}
          <Leaderboard />

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score-Verteilung pro Berater</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={scoreChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Bar
                        dataKey="speed"
                        stackId="a"
                        fill="#3b82f6"
                        name="Speed"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="reliability"
                        stackId="a"
                        fill="#10b981"
                        name={`Zuverl\u00e4ssigkeit`}
                      />
                      <Bar
                        dataKey="effectiveness"
                        stackId="a"
                        fill="#f59e0b"
                        name={`Effektivit\u00e4t`}
                      />
                      <Bar
                        dataKey="results"
                        stackId="a"
                        fill="#8b5cf6"
                        name="Ergebnisse"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Keine Daten verf{"\u00fc"}gbar
                  </p>
                )}
              </CardContent>
            </Card>

            {/* SLA Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>SLA-Einhaltung pro Berater</CardTitle>
              </CardHeader>
              <CardContent>
                {slaChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={slaChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Line
                        type="monotone"
                        dataKey="sla"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="SLA-Quote %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Keine Daten verf{"\u00fc"}gbar
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Contact Rate Trends */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Kontaktrate pro Berater</CardTitle>
              </CardHeader>
              <CardContent>
                {contactChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contactChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Bar
                        dataKey="kontaktrate"
                        fill="#3b82f6"
                        name="Kontaktrate %"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Keine Daten verf{"\u00fc"}gbar
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

