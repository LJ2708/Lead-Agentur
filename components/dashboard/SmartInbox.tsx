"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Tables, Database } from "@/types/database"
import {
  calculateLeadScore,
  type LeadScore,
} from "@/lib/scoring/lead-score"
import { LeadCard } from "@/components/dashboard/LeadCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChevronDown,
  ChevronRight,
  Check,
  Zap,
  Clock,
  Eye,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

type Lead = Tables<"leads">
type Activity = Tables<"lead_activities">
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _LeadStatus = Database["public"]["Enums"]["lead_status"]

interface ScoredLead {
  lead: Lead
  score: LeadScore
  activities: Activity[]
  lastActivityAt: string | null
}

interface SmartInboxProps {
  beraterId: string
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  leads: ScoredLead[]
  defaultOpen?: boolean
  beraterId: string
  onRefresh: () => void
  borderClass?: string
}

function InboxSection({
  title,
  icon,
  leads,
  defaultOpen = true,
  beraterId,
  onRefresh,
  borderClass,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (leads.length === 0) return null

  return (
    <div className={borderClass ? `rounded-lg border-2 ${borderClass} p-3` : undefined}>
      <button
        onClick={() => setOpen(!open)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {leads.length}
        </Badge>
      </button>

      {open && (
        <div className="space-y-2">
          {leads.map((sl) => (
            <LeadCard
              key={sl.lead.id}
              lead={sl.lead}
              score={sl.score}
              beraterId={beraterId}
              onUpdate={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InboxSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SmartInbox({ beraterId }: SmartInboxProps) {
  const [scoredLeads, setScoredLeads] = useState<ScoredLead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch active leads for this berater
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("berater_id", beraterId)
        .not("status", "in", '("abschluss","verloren")')
        .order("created_at", { ascending: false })

      if (leadsError) throw leadsError
      if (!leads || leads.length === 0) {
        setScoredLeads([])
        setLoading(false)
        return
      }

      // Fetch activities for all these leads
      const leadIds = leads.map((l) => l.id)
      const { data: activities } = await supabase
        .from("lead_activities")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })

      const activitiesByLead = new Map<string, Activity[]>()
      for (const activity of activities ?? []) {
        const existing = activitiesByLead.get(activity.lead_id) ?? []
        existing.push(activity)
        activitiesByLead.set(activity.lead_id, existing)
      }

      // Calculate scores
      const scored: ScoredLead[] = leads.map((lead) => {
        const leadActivities = activitiesByLead.get(lead.id) ?? []
        const score = calculateLeadScore(lead, leadActivities)
        const lastActivityAt =
          leadActivities.length > 0
            ? leadActivities[0].created_at
            : lead.zugewiesen_am

        return { lead, score, activities: leadActivities, lastActivityAt }
      })

      // Sort by score descending within each priority
      scored.sort((a, b) => b.score.total - a.score.total)

      setScoredLeads(scored)
    } catch {
      toast.error("Fehler beim Laden der Leads")
    } finally {
      setLoading(false)
    }
  }, [beraterId])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads, refreshKey])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const { slaLeads, hotLeads, warmLeads, coldLeads } = useMemo(() => {
    const sla: ScoredLead[] = []
    const hot: ScoredLead[] = []
    const warm: ScoredLead[] = []
    const cold: ScoredLead[] = []

    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000

    for (const sl of scoredLeads) {
      // Check SLA expiring within 10 minutes
      if (
        sl.lead.sla_status === "active" &&
        sl.lead.sla_deadline &&
        new Date(sl.lead.sla_deadline).getTime() <= tenMinutesFromNow
      ) {
        sla.push(sl)
        continue
      }

      if (sl.score.priority === "hot") hot.push(sl)
      else if (sl.score.priority === "warm") warm.push(sl)
      else cold.push(sl)
    }

    return { slaLeads: sla, hotLeads: hot, warmLeads: warm, coldLeads: cold }
  }, [scoredLeads])

  if (loading) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Smart Inbox</h2>
        </div>
        <InboxSkeleton />
      </div>
    )
  }

  if (scoredLeads.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <Check className="mx-auto h-10 w-10 text-emerald-500" />
        <h3 className="mt-3 text-lg font-semibold">Alles erledigt!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Keine offenen Leads zur Bearbeitung vorhanden.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Smart Inbox</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </Button>
      </div>

      <div className="space-y-6">
        <InboxSection
          title="SLA läuft ab"
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          leads={slaLeads}
          defaultOpen
          beraterId={beraterId}
          onRefresh={handleRefresh}
          borderClass="border-red-300"
        />
        <InboxSection
          title="Sofort handeln"
          icon={<Zap className="h-4 w-4 text-red-500" />}
          leads={hotLeads}
          defaultOpen
          beraterId={beraterId}
          onRefresh={handleRefresh}
        />
        <InboxSection
          title="Heute bearbeiten"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          leads={warmLeads}
          defaultOpen
          beraterId={beraterId}
          onRefresh={handleRefresh}
        />
        <InboxSection
          title="Beobachten"
          icon={<Eye className="h-4 w-4 text-blue-500" />}
          leads={coldLeads}
          defaultOpen={false}
          beraterId={beraterId}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
