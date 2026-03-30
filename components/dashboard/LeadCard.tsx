"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { SlaTimer } from "@/components/dashboard/SlaTimer"
import { LeadAcceptReject } from "@/components/dashboard/LeadAcceptReject"
import { ActionBar } from "@/components/dashboard/ActionBar"
import { OutcomeSelector } from "@/components/dashboard/OutcomeSelector"
import { getStatusColor, getStatusLabel, formatDate } from "@/lib/utils"
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Phone,
  Mail,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LeadScore } from "@/lib/scoring/lead-score"
import { formatTimeAgo } from "@/lib/scoring/lead-score"
import { PriorityFlag } from "@/components/dashboard/PriorityFlag"
import type { Tables } from "@/types/database"

type Activity = Tables<"lead_activities">

interface LeadCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lead: any
  score: LeadScore
  beraterId: string
  onUpdate: () => void
}

function PriorityDot({ priority }: { priority: "hot" | "warm" | "cold" }) {
  const colors = {
    hot: "bg-red-500",
    warm: "bg-amber-400",
    cold: "bg-blue-400",
  }

  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${colors[priority]}`}
      title={
        priority === "hot"
          ? "Heiß"
          : priority === "warm"
            ? "Warm"
            : "Kalt"
      }
    />
  )
}

function ScoreBadge({ score }: { score: number }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary"
  if (score >= 70) variant = "default"
  else if (score < 40) variant = "outline"

  return (
    <Badge variant={variant} className="tabular-nums">
      {score}
    </Badge>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: "Meta Ad",
  landingpage: "Landingpage",
  manuell: "Manuell",
  import: "Import",
}

const PRIORITY_BORDER: Record<string, string> = {
  hot: "border-l-red-500",
  warm: "border-l-amber-400",
  cold: "border-l-blue-400",
}

export function LeadCard({ lead, score, beraterId, onUpdate }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showOutcome, setShowOutcome] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  const leadName = `${lead.vorname ?? ""} ${lead.nachname ?? ""}`.trim() || "Unbekannt"

  // Determine if lead needs acceptance (neu/zugewiesen, not yet accepted)
  const needsAcceptance =
    (lead.status === "neu" || lead.status === "zugewiesen") && !lead.accepted_at

  // SLA
  const slaActive = lead.sla_status === "active" && lead.sla_deadline

  // Load activities when expanded
  useEffect(() => {
    if (!expanded) return
    let cancelled = false

    const loadActivities = async () => {
      setLoadingActivities(true)
      const supabase = createClient()
      const { data } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!cancelled && data) {
        setActivities(data)
      }
      if (!cancelled) setLoadingActivities(false)
    }

    loadActivities()
    return () => {
      cancelled = true
    }
  }, [expanded, lead.id])

  const handleCallComplete = useCallback(() => {
    setShowOutcome(true)
  }, [])

  const handleOutcomeComplete = useCallback(() => {
    setShowOutcome(false)
    onUpdate()
  }, [onUpdate])

  const handleOutcomeClose = useCallback(() => {
    setShowOutcome(false)
  }, [])

  const handleAcceptRejectDone = useCallback(() => {
    onUpdate()
  }, [onUpdate])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _beraterId = beraterId

  return (
    <>
      <div
        className={cn(
          "group rounded-xl border border-l-4 bg-card transition-all hover:shadow-md",
          PRIORITY_BORDER[score.priority] ?? "border-l-gray-300"
        )}
      >
        {/* Compact mode: header area — clickable to expand */}
        <div className="p-4">
          {/* Row 1: Priority + Name + Score + SLA */}
          <button
            type="button"
            className="flex w-full items-center gap-3 text-left"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <PriorityDot priority={score.priority} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span onClick={(e) => e.stopPropagation()}>
                  <PriorityFlag
                    leadId={lead.id}
                    currentPriority={
                      (lead.custom_fields as Record<string, string> | null)?.priority as
                        | "none"
                        | "low"
                        | "medium"
                        | "high"
                        | "urgent" ?? "none"
                    }
                  />
                </span>
                <Link
                  href={`/berater/leads/${lead.id}`}
                  className="truncate text-base font-semibold text-foreground hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {leadName}
                </Link>
                <ScoreBadge score={score.total} />
                {slaActive && (
                  <SlaTimer
                    deadline={lead.sla_deadline as string}
                    status="active"
                  />
                )}
                {lead.sla_status === "breached" && (
                  <SlaTimer deadline={lead.sla_deadline ?? ""} status="breached" />
                )}
              </div>
            </div>
          </button>

          {/* Row 2: Contact info + source + status */}
          <div className="mt-1.5 ml-9 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {lead.telefon && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.telefon}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {lead.email}
              </span>
            )}
            {lead.source && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {SOURCE_LABELS[lead.source] ?? lead.source}
              </Badge>
            )}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                getStatusColor(lead.status)
              )}
            >
              {getStatusLabel(lead.status)}
            </span>
          </div>

          {/* Row 2b: Ad Creative */}
          {lead.ad_name && (
            <div className="ml-9 mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">Anzeige:</span>
              <span className="truncate">{lead.ad_name}</span>
            </div>
          )}

          {/* Row 3: AI suggestion */}
          <div className="mt-2.5 ml-9 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="font-medium text-foreground">
                {score.nextAction}
              </span>
              <span className="hidden text-muted-foreground sm:inline">
                &mdash; {score.reasoning}
              </span>
            </div>
          </div>

          {/* Row 4: ActionBar or AcceptReject */}
          <div className="mt-2.5 ml-9">
            {needsAcceptance ? (
              <LeadAcceptReject
                leadId={lead.id}
                leadName={leadName}
                onAccept={handleAcceptRejectDone}
                onReject={handleAcceptRejectDone}
              />
            ) : (
              <ActionBar
                lead={{
                  id: lead.id,
                  telefon: lead.telefon,
                  email: lead.email,
                  vorname: lead.vorname,
                  nachname: lead.nachname,
                  opt_in_whatsapp: lead.opt_in_whatsapp,
                }}
                onCallComplete={handleCallComplete}
                onActionComplete={onUpdate}
              />
            )}
          </div>
        </div>

        {/* Expanded mode */}
        {expanded && (
          <div className="border-t px-4 py-4 transition-all">
            {/* Full contact details */}
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Kontaktdetails
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{leadName}</dd>
                <dt className="text-muted-foreground">Telefon</dt>
                <dd>{lead.telefon ?? "—"}</dd>
                <dt className="text-muted-foreground">E-Mail</dt>
                <dd className="break-all">{lead.email ?? "—"}</dd>
                <dt className="text-muted-foreground">Kontaktversuche</dt>
                <dd>{lead.kontaktversuche ?? 0}</dd>
                {lead.zugewiesen_am && (
                  <>
                    <dt className="text-muted-foreground">Zugewiesen am</dt>
                    <dd>{formatDate(lead.zugewiesen_am)}</dd>
                  </>
                )}
                {lead.termin_am && (
                  <>
                    <dt className="text-muted-foreground">Termin</dt>
                    <dd>{formatDate(lead.termin_am)}</dd>
                  </>
                )}
              </dl>
            </div>

            {/* Werbeanzeige */}
            {lead.ad_name && (
              <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
                <h4 className="mb-1 text-sm font-semibold text-foreground">Werbeanzeige</h4>
                <p className="text-sm">{lead.ad_name}</p>
              </div>
            )}

            {/* Custom Fields */}
            {lead.custom_fields && typeof lead.custom_fields === 'object' && Object.keys(lead.custom_fields as Record<string, unknown>).length > 0 && (
              <div className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-foreground">Zusätzliche Infos</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {Object.entries(lead.custom_fields as Record<string, string>).map(([key, val]) => val ? (
                    <div key={key} className="contents">
                      <dt className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt>
                      <dd>{val}</dd>
                    </div>
                  ) : null)}
                </dl>
              </div>
            )}

            {/* UTM / Campaign info */}
            {(lead.campaign || lead.utm_source || lead.utm_campaign) && (
              <div className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Kampagne / UTM
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {lead.campaign && (
                    <>
                      <dt className="text-muted-foreground">Kampagne</dt>
                      <dd>{lead.campaign}</dd>
                    </>
                  )}
                  {lead.utm_source && (
                    <>
                      <dt className="text-muted-foreground">UTM Source</dt>
                      <dd>{lead.utm_source}</dd>
                    </>
                  )}
                  {lead.utm_medium && (
                    <>
                      <dt className="text-muted-foreground">UTM Medium</dt>
                      <dd>{lead.utm_medium}</dd>
                    </>
                  )}
                  {lead.utm_campaign && (
                    <>
                      <dt className="text-muted-foreground">UTM Campaign</dt>
                      <dd>{lead.utm_campaign}</dd>
                    </>
                  )}
                  {lead.utm_content && (
                    <>
                      <dt className="text-muted-foreground">UTM Content</dt>
                      <dd>{lead.utm_content}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {/* Activity timeline */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Letzte Aktivitäten
              </h4>
              {loadingActivities ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Laden...
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine Aktivitäten vorhanden.
                </p>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{activity.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OutcomeSelector overlay */}
      <OutcomeSelector
        leadId={lead.id}
        leadName={leadName}
        open={showOutcome}
        onClose={handleOutcomeClose}
        onComplete={handleOutcomeComplete}
      />
    </>
  )
}
