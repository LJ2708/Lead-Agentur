"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeeklySummaryProps {
  beraterId: string
}

interface WeeklyData {
  leadsErhalten: number
  kontaktiert: number
  termine: number
  abschluesse: number
  score: number
}

interface ComparisonRow {
  label: string
  current: number | string
  diff: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekRange(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() + mondayOffset - weeksAgo * 7)
  thisMonday.setHours(0, 0, 0, 0)

  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisMonday.getDate() + 6)
  thisSunday.setHours(23, 59, 59, 999)

  return { start: thisMonday, end: thisSunday }
}

function DiffBadge({ diff, suffix }: { diff: number; suffix?: string }) {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>=</span>
      </span>
    )
  }

  const isPositive = diff > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-green-600" : "text-red-600"
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {isPositive ? "+" : ""}
        {diff}
        {suffix ?? ""}
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeeklySummary({ beraterId }: WeeklySummaryProps) {
  const [loading, setLoading] = useState(true)
  const [thisWeek, setThisWeek] = useState<WeeklyData | null>(null)
  const [lastWeek, setLastWeek] = useState<WeeklyData | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchWeekData(weeksAgo: number): Promise<WeeklyData> {
      const { start, end } = getWeekRange(weeksAgo)

      // Leads assigned this week
      const { data: leads } = await supabase
        .from("leads")
        .select("id, status, zugewiesen_am")
        .eq("berater_id", beraterId)
        .gte("zugewiesen_am", start.toISOString())
        .lte("zugewiesen_am", end.toISOString())

      const weekLeads = leads ?? []
      const leadsErhalten = weekLeads.length
      const kontaktiert = weekLeads.filter(
        (l) =>
          l.status !== "neu" &&
          l.status !== "zugewiesen" &&
          l.status !== "warteschlange"
      ).length
      const abschluesse = weekLeads.filter(
        (l) => l.status === "abschluss"
      ).length

      // Termine this week
      const { data: termine } = await supabase
        .from("termine")
        .select("id")
        .eq("berater_id", beraterId)
        .gte("datum", start.toISOString())
        .lte("datum", end.toISOString())

      const termineCount = termine?.length ?? 0

      // Simple score: weighted
      const scoreBase = kontaktiert * 10 + termineCount * 20 + abschluesse * 30
      const score =
        leadsErhalten > 0
          ? Math.min(100, Math.round((scoreBase / leadsErhalten) * 3.3))
          : 0

      return {
        leadsErhalten,
        kontaktiert,
        termine: termineCount,
        abschluesse,
        score,
      }
    }

    async function load() {
      setLoading(true)
      const [tw, lw] = await Promise.all([
        fetchWeekData(0),
        fetchWeekData(1),
      ])
      setThisWeek(tw)
      setLastWeek(lw)
      setLoading(false)
    }

    load()
  }, [beraterId, supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Wochenübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!thisWeek || !lastWeek) return null

  const rows: ComparisonRow[] = [
    {
      label: "Leads erhalten",
      current: thisWeek.leadsErhalten,
      diff: thisWeek.leadsErhalten - lastWeek.leadsErhalten,
    },
    {
      label: "Kontaktiert",
      current: thisWeek.kontaktiert,
      diff: thisWeek.kontaktiert - lastWeek.kontaktiert,
    },
    {
      label: "Termine",
      current: thisWeek.termine,
      diff: thisWeek.termine - lastWeek.termine,
    },
    {
      label: "Abschlüsse",
      current: thisWeek.abschluesse,
      diff: thisWeek.abschluesse - lastWeek.abschluesse,
    },
    {
      label: "Score",
      current: `${thisWeek.score}/100`,
      diff: thisWeek.score - lastWeek.score,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Wochenübersicht</CardTitle>
        <p className="text-xs text-muted-foreground">
          vs. letzte Woche
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{row.current}</span>
                <DiffBadge diff={row.diff} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
