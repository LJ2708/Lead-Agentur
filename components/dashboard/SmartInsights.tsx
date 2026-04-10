"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Trophy,
  BarChart3,
  Phone,
  CalendarX,
  Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

type InsightSeverity = "danger" | "warning" | "info" | "success"

interface Insight {
  id: string
  severity: InsightSeverity
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

const severityOrder: Record<InsightSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
}

const severityStyles: Record<InsightSeverity, { bg: string; text: string; icon: string }> = {
  danger: { bg: "bg-red-50", text: "text-red-800", icon: "text-red-500" },
  warning: { bg: "bg-amber-50", text: "text-amber-800", icon: "text-amber-500" },
  info: { bg: "bg-blue-50", text: "text-blue-800", icon: "text-blue-500" },
  success: { bg: "bg-green-50", text: "text-green-800", icon: "text-green-500" },
}

const MAX_INSIGHTS = 5

export function SmartInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInsights = useCallback(async () => {
    const supabase = createClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString()
    const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 6).toISOString()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

    const collected: Insight[] = []

    // 1. Wartende Leads (neu + warteschlange)
    const [{ count: neuCount }, { count: warteschlangeCount }] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "neu"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "warteschlange"),
    ])
    const wartend = (neuCount ?? 0) + (warteschlangeCount ?? 0)
    if (wartend > 0) {
      collected.push({
        id: "wartende-leads",
        severity: "warning",
        icon: AlertTriangle,
        title: `${wartend} Leads warten auf Zuweisung`,
        description: "Diese Leads sind noch keinem Berater zugewiesen.",
        actionLabel: "Jetzt verteilen",
        actionHref: "/admin/leads",
      })
    }

    // 2. Ueberfaellige Leads (zugewiesen > 2h, keine kontaktversuche)
    const { data: overdue } = await supabase
      .from("leads")
      .select("id")
      .eq("status", "zugewiesen")
      .lt("zugewiesen_am", twoHoursAgo)
      .eq("kontaktversuche", 0)
    const overdueCount = overdue?.length ?? 0
    if (overdueCount > 0) {
      collected.push({
        id: "ueberfaellige-leads",
        severity: "danger",
        icon: AlertCircle,
        title: `${overdueCount} Leads seit >2h ohne Kontakt`,
        description: "Diese zugewiesenen Leads wurden noch nicht kontaktiert.",
        actionLabel: "Anzeigen",
        actionHref: "/admin/leads",
      })
    }

    // 3. Pacing Alert - berater behind pacing
    const { data: beraterList } = await supabase
      .from("berater")
      .select("id, leads_kontingent, leads_geliefert, profiles:profile_id(full_name)")
      .eq("status", "aktiv")

    if (beraterList) {
      const dayOfMonth = now.getDate()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const expectedPacing = dayOfMonth / daysInMonth

      for (const b of beraterList) {
        const kontingent = b.leads_kontingent ?? 0
        const geliefert = b.leads_geliefert ?? 0
        if (kontingent === 0) continue
        const expectedDelivered = Math.round(kontingent * expectedPacing)
        // Behind by more than 30%
        if (geliefert < expectedDelivered * 0.7 && expectedDelivered > 2) {
          const profile = b.profiles as unknown as { full_name: string | null } | null
          const name = profile?.full_name ?? "Unbekannt"
          collected.push({
            id: `pacing-${b.id}`,
            severity: "warning",
            icon: AlertTriangle,
            title: `Berater ${name} ist hinter Pacing`,
            description: `${geliefert}/${kontingent} Leads geliefert (Soll: ~${expectedDelivered})`,
          })
        }
      }
    }

    // 4. Conversion Rate this month
    const { count: totalLeadsMonth } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart)

    const { count: abschlussMonth } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "abschluss")
      .gte("abschluss_am", monthStart)

    const total = totalLeadsMonth ?? 0
    const abschluss = abschlussMonth ?? 0
    if (total > 0) {
      const rate = Math.round((abschluss / total) * 100)
      const severity: InsightSeverity = rate >= 20 ? "success" : rate >= 10 ? "warning" : "danger"
      collected.push({
        id: "conversion-rate",
        severity,
        icon: BarChart3,
        title: `Conversion Rate: ${rate}% diesen Monat`,
        description: `${abschluss} Abschlüsse von ${total} Leads`,
      })
    }

    // 5. Top Performer
    if (beraterList) {
      const { data: abschlussLeads } = await supabase
        .from("leads")
        .select("berater_id")
        .eq("status", "abschluss")
        .gte("abschluss_am", monthStart)

      if (abschlussLeads && abschlussLeads.length > 0) {
        const countByBerater: Record<string, number> = {}
        for (const lead of abschlussLeads) {
          if (lead.berater_id) {
            countByBerater[lead.berater_id] = (countByBerater[lead.berater_id] ?? 0) + 1
          }
        }
        const topId = Object.entries(countByBerater).sort((a, b) => b[1] - a[1])[0]
        if (topId) {
          const topBerater = beraterList.find((b) => b.id === topId[0])
          if (topBerater) {
            const profile = topBerater.profiles as unknown as { full_name: string | null } | null
            const name = profile?.full_name ?? "Unbekannt"
            collected.push({
              id: "top-performer",
              severity: "success",
              icon: Trophy,
              title: `Top Berater: ${name}`,
              description: `${topId[1]} Abschlüsse diesen Monat`,
            })
          }
        }
      }
    }

    // 6. Setter Performance
    const { data: setterProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "setter")

    if (setterProfiles && setterProfiles.length > 0) {
      const { data: setterLeads } = await supabase
        .from("leads")
        .select("setter_id, kontaktversuche")
        .gte("created_at", monthStart)
        .not("setter_id", "is", null)

      if (setterLeads && setterLeads.length > 0) {
        const kontakteByS: Record<string, number> = {}
        for (const lead of setterLeads) {
          if (lead.setter_id) {
            kontakteByS[lead.setter_id] = (kontakteByS[lead.setter_id] ?? 0) + (lead.kontaktversuche ?? 0)
          }
        }
        const topSetter = Object.entries(kontakteByS).sort((a, b) => b[1] - a[1])[0]
        if (topSetter) {
          const setterProfile = setterProfiles.find((s) => s.id === topSetter[0])
          if (setterProfile) {
            collected.push({
              id: "setter-performance",
              severity: "info",
              icon: Phone,
              title: `Top Setter: ${setterProfile.full_name}`,
              description: `${topSetter[1]} Kontaktversuche diesen Monat`,
            })
          }
        }
      }
    }

    // 7. Trend - this week vs last week
    const { count: thisWeekCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart)

    const { count: lastWeekCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", lastWeekStart)
      .lt("created_at", weekStart)

    const thisWeek = thisWeekCount ?? 0
    const lastWeek = lastWeekCount ?? 0
    if (lastWeek > 0) {
      const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      if (change > 0) {
        collected.push({
          id: "trend",
          severity: "success",
          icon: TrendingUp,
          title: `+${change}% mehr Leads als letzte Woche`,
          description: `${thisWeek} vs. ${lastWeek} Leads`,
        })
      } else if (change < 0) {
        collected.push({
          id: "trend",
          severity: "warning",
          icon: TrendingDown,
          title: `${change}% weniger Leads als letzte Woche`,
          description: `${thisWeek} vs. ${lastWeek} Leads`,
        })
      }
    }

    // 8. No-Shows
    const { count: noShowCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "no_show")
      .gte("created_at", monthStart)

    const noShows = noShowCount ?? 0
    if (noShows > 0) {
      collected.push({
        id: "no-shows",
        severity: "warning",
        icon: CalendarX,
        title: `${noShows} No-Shows diesen Monat`,
        description: "Termine, die nicht wahrgenommen wurden.",
      })
    }

    // TODO: Remove demo filter after sales call
    const DEMO_MODE = true
    const filtered = DEMO_MODE
      ? collected.filter((i) => !i.id.startsWith("pacing-") && i.id !== "unassigned-leads")
      : collected

    // Sort by severity, then slice top 5
    filtered.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    setInsights(filtered.slice(0, MAX_INSIGHTS))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInsights()
    const interval = setInterval(fetchInsights, 60_000)
    return () => clearInterval(interval)
  }, [fetchInsights])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <CardTitle>KI-Einblicke</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine besonderen Einblicke vorhanden.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => {
              const styles = severityStyles[insight.severity]
              const Icon = insight.icon
              return (
                <li
                  key={insight.id}
                  className={`flex items-start gap-3 rounded-lg p-3 ${styles.bg}`}
                >
                  <div className={`mt-0.5 shrink-0 ${styles.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${styles.text}`}>
                      {insight.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                  {insight.actionLabel && insight.actionHref && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      asChild
                    >
                      <Link href={insight.actionHref}>{insight.actionLabel}</Link>
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
