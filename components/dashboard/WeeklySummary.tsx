"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
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

function InlineDiff({ diff }: { diff: number }) {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />
        <span>=</span>
      </span>
    )
  }

  const isPositive = diff > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium",
        isPositive ? "text-green-600" : "text-red-600"
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-2.5 w-2.5" />
      ) : (
        <TrendingDown className="h-2.5 w-2.5" />
      )}
      <span>
        {isPositive ? "+" : ""}
        {diff}
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
      <div className="rounded-lg border bg-card px-4 py-2.5">
        <Skeleton className="h-5 w-full" />
      </div>
    )
  }

  if (!thisWeek || !lastWeek) return null

  const metrics: { label: string; value: number | string; diff: number }[] = [
    {
      label: "Leads",
      value: thisWeek.leadsErhalten,
      diff: thisWeek.leadsErhalten - lastWeek.leadsErhalten,
    },
    {
      label: "Kontaktiert",
      value: thisWeek.kontaktiert,
      diff: thisWeek.kontaktiert - lastWeek.kontaktiert,
    },
    {
      label: "Termine",
      value: thisWeek.termine,
      diff: thisWeek.termine - lastWeek.termine,
    },
    {
      label: "Abschlüsse",
      value: thisWeek.abschluesse,
      diff: thisWeek.abschluesse - lastWeek.abschluesse,
    },
    {
      label: "Score",
      value: `${thisWeek.score}/100`,
      diff: thisWeek.score - lastWeek.score,
    },
  ]

  return (
    <div className="rounded-lg border bg-card px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        <span className="mr-1 text-xs font-medium text-muted-foreground">
          Woche:
        </span>
        {metrics.map((m, i) => (
          <span key={m.label} className="inline-flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{m.label}:</span>
            <span className="text-xs font-semibold">{m.value}</span>
            <InlineDiff diff={m.diff} />
            {i < metrics.length - 1 && (
              <span className="mx-1 text-muted-foreground/40">|</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
