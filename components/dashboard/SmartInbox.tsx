"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Database } from "@/types/database";
import {
  calculateLeadScore,
  formatTimeAgo,
  type LeadScore,
} from "@/lib/scoring/lead-score";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { QuickCallLogger } from "@/components/dashboard/QuickCallLogger";
import { QuickNoteAdder } from "@/components/dashboard/QuickNoteAdder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Mail,
  MessageCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Loader2,
  Check,
  Zap,
  Clock,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type Lead = Tables<"leads">;
type Activity = Tables<"lead_activities">;
type LeadStatus = Database["public"]["Enums"]["lead_status"];

interface ScoredLead {
  lead: Lead;
  score: LeadScore;
  activities: Activity[];
  lastActivityAt: string | null;
}

interface SmartInboxProps {
  beraterId: string;
}

type QuickAction = "call" | "note" | "status" | null;

const VALID_STATUS_TRANSITIONS: Record<string, LeadStatus[]> = {
  neu: ["zugewiesen", "verloren"],
  zugewiesen: ["kontaktversuch", "nicht_erreicht", "verloren"],
  kontaktversuch: [
    "nicht_erreicht",
    "qualifiziert",
    "verloren",
  ],
  nicht_erreicht: [
    "kontaktversuch",
    "qualifiziert",
    "verloren",
  ],
  qualifiziert: ["termin", "nachfassen", "verloren"],
  termin: ["show", "no_show", "verloren"],
  show: ["abschluss", "nachfassen", "verloren"],
  no_show: ["termin", "nachfassen", "verloren"],
  nachfassen: [
    "kontaktversuch",
    "qualifiziert",
    "termin",
    "verloren",
  ],
  abschluss: [],
  verloren: ["kontaktversuch"],
  warteschlange: ["zugewiesen"],
};

function PriorityDot({ priority }: { priority: "hot" | "warm" | "cold" }) {
  const colors = {
    hot: "bg-red-500",
    warm: "bg-amber-400",
    cold: "bg-blue-400",
  };

  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${colors[priority]}`}
      title={
        priority === "hot"
          ? "Hei\u00df"
          : priority === "warm"
            ? "Warm"
            : "Kalt"
      }
    />
  );
}

function ScoreBadge({ score }: { score: number }) {
  let variant: "default" | "secondary" | "destructive" | "outline" =
    "secondary";
  if (score >= 70) variant = "default";
  else if (score < 40) variant = "outline";

  return (
    <Badge variant={variant} className="tabular-nums">
      Score: {score}
    </Badge>
  );
}

function LeadCard({
  scoredLead,
  onRefresh,
}: {
  scoredLead: ScoredLead;
  onRefresh: () => void;
}) {
  const { lead, score } = scoredLead;
  const [activeAction, setActiveAction] = useState<QuickAction>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      setStatusChanging(true);
      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error: updateError } = await supabase
          .from("leads")
          .update({ status: newStatus as LeadStatus })
          .eq("id", lead.id);

        if (updateError) throw updateError;

        await supabase.from("lead_activities").insert({
          lead_id: lead.id,
          type: "status_change",
          title: `Status ge\u00e4ndert: ${getStatusLabel(lead.status)} \u2192 ${getStatusLabel(newStatus)}`,
          old_value: lead.status,
          new_value: newStatus,
          created_by: user?.id ?? null,
        });

        toast.success(
          `Status auf "${getStatusLabel(newStatus)}" ge\u00e4ndert`
        );
        setActiveAction(null);
        onRefresh();
      } catch {
        toast.error("Fehler beim \u00c4ndern des Status");
      } finally {
        setStatusChanging(false);
      }
    },
    [lead.id, lead.status, onRefresh]
  );

  const handleActionComplete = useCallback(() => {
    setActiveAction(null);
    onRefresh();
  }, [onRefresh]);

  const validTransitions = VALID_STATUS_TRANSITIONS[lead.status] ?? [];

  return (
    <div className="group rounded-xl border bg-card transition-all hover:shadow-md">
      {/* Main card content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Priority dot */}
          <div className="mt-1.5">
            <PriorityDot priority={score.priority} />
          </div>

          {/* Lead info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/berater/leads/${lead.id}`}
                  className="text-base font-semibold leading-tight text-foreground hover:underline"
                >
                  {lead.vorname ?? ""} {lead.nachname ?? "Unbekannt"}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {lead.email && <span>{lead.email}</span>}
                  {lead.telefon && <span>{lead.telefon}</span>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ScoreBadge score={score.total} />
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(lead.status)}`}
                >
                  {getStatusLabel(lead.status)}
                </span>
              </div>
            </div>

            {/* AI suggestion banner */}
            <div className="mt-2.5 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">
                  {score.nextAction}
                </span>
                <span className="hidden text-muted-foreground sm:inline">
                  &mdash; {score.reasoning}
                </span>
              </div>
              {scoredLead.lastActivityAt && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTimeAgo(scoredLead.lastActivityAt)}
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <Button
                variant={activeAction === "call" ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() =>
                  setActiveAction(activeAction === "call" ? null : "call")
                }
              >
                <Phone className="h-3.5 w-3.5" />
                Anrufen
              </Button>
              {lead.email && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  asChild
                >
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                </Button>
              )}
              {lead.telefon && lead.opt_in_whatsapp && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  asChild
                >
                  <a
                    href={`https://wa.me/${lead.telefon.replace(/[^0-9+]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </Button>
              )}
              <Button
                variant={activeAction === "note" ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() =>
                  setActiveAction(activeAction === "note" ? null : "note")
                }
              >
                <FileText className="h-3.5 w-3.5" />
                Notiz
              </Button>
              {validTransitions.length > 0 && (
                <Button
                  variant={activeAction === "status" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() =>
                    setActiveAction(
                      activeAction === "status" ? null : "status"
                    )
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Status
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline action panels */}
      {activeAction === "call" && (
        <div className="border-t px-4 py-3">
          <QuickCallLogger
            leadId={lead.id}
            leadName={`${lead.vorname ?? ""} ${lead.nachname ?? ""}`.trim()}
            leadPhone={lead.telefon}
            onComplete={handleActionComplete}
          />
        </div>
      )}

      {activeAction === "note" && (
        <div className="border-t px-4 py-3">
          <QuickNoteAdder leadId={lead.id} onComplete={handleActionComplete} />
        </div>
      )}

      {activeAction === "status" && (
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <Select
              onValueChange={handleStatusChange}
              disabled={statusChanging}
            >
              <SelectTrigger className="h-9 w-[220px] bg-background">
                <SelectValue placeholder="Neuer Status..." />
              </SelectTrigger>
              <SelectContent>
                {validTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusChanging && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  leads: ScoredLead[];
  defaultOpen?: boolean;
  onRefresh: () => void;
}

function InboxSection({
  title,
  icon,
  leads,
  defaultOpen = true,
  onRefresh,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (leads.length === 0) return null;

  return (
    <div>
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
            <LeadCard key={sl.lead.id} scoredLead={sl} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
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
  );
}

export function SmartInbox({ beraterId }: SmartInboxProps) {
  const [scoredLeads, setScoredLeads] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch active leads for this berater
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("berater_id", beraterId)
        .not("status", "in", '("abschluss","verloren")')
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;
      if (!leads || leads.length === 0) {
        setScoredLeads([]);
        setLoading(false);
        return;
      }

      // Fetch activities for all these leads
      const leadIds = leads.map((l) => l.id);
      const { data: activities } = await supabase
        .from("lead_activities")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });

      const activitiesByLead = new Map<string, Activity[]>();
      for (const activity of activities ?? []) {
        const existing = activitiesByLead.get(activity.lead_id) ?? [];
        existing.push(activity);
        activitiesByLead.set(activity.lead_id, existing);
      }

      // Calculate scores
      const scored: ScoredLead[] = leads.map((lead) => {
        const leadActivities = activitiesByLead.get(lead.id) ?? [];
        const score = calculateLeadScore(lead, leadActivities);
        const lastActivityAt =
          leadActivities.length > 0
            ? leadActivities[0].created_at
            : lead.zugewiesen_am;

        return { lead, score, activities: leadActivities, lastActivityAt };
      });

      // Sort by score descending within each priority
      scored.sort((a, b) => b.score.total - a.score.total);

      setScoredLeads(scored);
    } catch {
      toast.error("Fehler beim Laden der Leads");
    } finally {
      setLoading(false);
    }
  }, [beraterId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const { hotLeads, warmLeads, coldLeads } = useMemo(() => {
    const hot: ScoredLead[] = [];
    const warm: ScoredLead[] = [];
    const cold: ScoredLead[] = [];

    for (const sl of scoredLeads) {
      if (sl.score.priority === "hot") hot.push(sl);
      else if (sl.score.priority === "warm") warm.push(sl);
      else cold.push(sl);
    }

    return { hotLeads: hot, warmLeads: warm, coldLeads: cold };
  }, [scoredLeads]);

  if (loading) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Smart Inbox</h2>
        </div>
        <InboxSkeleton />
      </div>
    );
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
    );
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
          title="Sofort handeln"
          icon={<Zap className="h-4 w-4 text-red-500" />}
          leads={hotLeads}
          defaultOpen
          onRefresh={handleRefresh}
        />
        <InboxSection
          title="Heute bearbeiten"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          leads={warmLeads}
          defaultOpen
          onRefresh={handleRefresh}
        />
        <InboxSection
          title="Beobachten"
          icon={<Eye className="h-4 w-4 text-blue-500" />}
          leads={coldLeads}
          defaultOpen={false}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
