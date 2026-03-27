"use client"

import { useState, useEffect, useCallback } from "react"
import { cn, formatEuro } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ShieldCheck,
  Phone,
  CalendarCheck,
  Target,
  Euro,
} from "lucide-react"
import type { RepPerformance } from "@/lib/performance/scoring"

interface PerformanceWidgetProps {
  beraterId: string
}

type Period = "today" | "week" | "month"

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "---"
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  return `${Math.round(seconds / 3600)}h`
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  const color =
    score > 70
      ? "text-emerald-500"
      : score >= 40
        ? "text-amber-500"
        : "text-red-500"

  const bgColor =
    score > 70
      ? "stroke-emerald-100"
      : score >= 40
        ? "stroke-amber-100"
        : "stroke-red-100"

  const strokeColor =
    score > 70
      ? "stroke-emerald-500"
      : score >= 40
        ? "stroke-amber-500"
        : "stroke-red-500"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="10"
          className={bgColor}
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-bold", color)}>{score}</span>
        <span className="text-xs text-muted-foreground">von 100</span>
      </div>
    </div>
  )
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function TrendArrow({ trend, previousScore }: { trend: "up" | "down" | "stable"; previousScore: number | null }) {
  return (
    <div className="flex items-center gap-1.5">
      {trend === "up" && (
        <>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">Aufsteigend</span>
        </>
      )}
      {trend === "down" && (
        <>
          <TrendingDown className="h-4 w-4 text-red-500" />
          <span className="text-xs font-medium text-red-600">Absteigend</span>
        </>
      )}
      {trend === "stable" && (
        <>
          <Minus className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Stabil</span>
        </>
      )}
      {previousScore !== null && (
        <span className="text-xs text-muted-foreground">(vorher: {previousScore})</span>
      )}
    </div>
  )
}

export function PerformanceWidget({ beraterId }: PerformanceWidgetProps) {
  const [period, setPeriod] = useState<Period>("week")
  const [data, setData] = useState<RepPerformance | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/performance?beraterId=${beraterId}&period=${period}`
      )
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Silently handle error
    } finally {
      setLoading(false)
    }
  }, [beraterId, period])

  useEffect(() => {
    setLoading(true)
    fetchPerformance()
    const interval = setInterval(fetchPerformance, 60_000)
    return () => clearInterval(interval)
  }, [fetchPerformance])

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meine Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meine Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Keine Daten verf&uuml;gbar</p>
        </CardContent>
      </Card>
    )
  }

  const metrics = [
    {
      label: "Ø Annahmezeit",
      value: formatSeconds(data.avgTimeToAccept),
      icon: Clock,
    },
    {
      label: "SLA-Quote",
      value: `${data.slaRate}%`,
      icon: ShieldCheck,
    },
    {
      label: "Kontaktrate",
      value: `${data.contactRate}%`,
      icon: Phone,
    },
    {
      label: "Terminquote",
      value: `${data.appointmentRate}%`,
      icon: CalendarCheck,
    },
    {
      label: "Abschlussrate",
      value: `${data.closeRate}%`,
      icon: Target,
    },
    {
      label: "Umsatz",
      value: formatEuro(data.totalRevenueCents),
      icon: Euro,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Meine Performance</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-2.5">
                Heute
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2.5">
                Woche
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2.5">
                Monat
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score Circle + Breakdown */}
        <div className="flex items-start gap-6">
          <ScoreCircle score={data.overallScore} />
          <div className="flex-1 space-y-2.5 pt-1">
            <MiniBar label="Speed" value={data.scoreBreakdown.speed} max={25} />
            <MiniBar
              label="Zuverlässigkeit"
              value={data.scoreBreakdown.reliability}
              max={25}
            />
            <MiniBar
              label="Effektivität"
              value={data.scoreBreakdown.effectiveness}
              max={25}
            />
            <MiniBar label="Ergebnisse" value={data.scoreBreakdown.results} max={25} />
          </div>
        </div>

        {/* Trend + Rank */}
        <div className="flex items-center justify-between border-t pt-3">
          <TrendArrow trend={data.trend} previousScore={data.previousScore} />
          {data.rank !== null && data.totalReps !== null && (
            <span className="text-sm font-medium text-muted-foreground">
              Platz {data.rank} von {data.totalReps} Beratern
            </span>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.label}
                className="flex items-center gap-2.5 rounded-lg border p-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold">{m.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
