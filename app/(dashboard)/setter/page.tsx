"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionBar } from "@/components/dashboard/ActionBar";
import { OutcomeSelector } from "@/components/dashboard/OutcomeSelector";
import { SlaTimer } from "@/components/dashboard/SlaTimer";
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge";
import { LeadActivityTimeline } from "@/components/dashboard/LeadActivityTimeline";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  calculateLeadScore,
  formatTimeAgo,
} from "@/lib/scoring/lead-score";
import {
  getValidTransitions,
  STATUS_CONFIG,
  type LeadState,
} from "@/lib/leads/state-machine";
import { cn } from "@/lib/utils";
import {
  Headphones,
  Phone,
  CalendarCheck,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads"> & {
  berater_name?: string | null;
};

type Activity = Tables<"lead_activities"> & {
  created_by_name?: string | null;
};

type FilterTab = "alle" | "sofort" | "rueckruf" | "followup" | "erledigt";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "sofort", label: "Sofort anrufen" },
  { key: "rueckruf", label: "Rückruf" },
  { key: "followup", label: "Follow-up" },
  { key: "erledigt", label: "Erledigt" },
];

// Priority category for card border and sorting
type PriorityCategory = "sla" | "new" | "callback" | "followup" | "completed";

function getPriorityCategory(lead: Lead): PriorityCategory {
  if (lead.sla_status === "active" && lead.sla_deadline) return "sla";
  if (
    ["neu", "zugewiesen"].includes(lead.status) &&
    lead.kontaktversuche === 0
  )
    return "new";
  if (lead.callback_at || lead.status === "nicht_erreicht") return "callback";
  if (
    ["kontaktversuch", "qualifiziert", "nachfassen"].includes(lead.status)
  )
    return "followup";
  return "completed";
}

const PRIORITY_ORDER: Record<PriorityCategory, number> = {
  sla: 0,
  new: 1,
  callback: 2,
  followup: 3,
  completed: 4,
};

const PRIORITY_BORDER: Record<PriorityCategory, string> = {
  sla: "border-l-4 border-l-red-500",
  new: "border-l-4 border-l-amber-500",
  callback: "border-l-4 border-l-blue-500",
  followup: "border-l-4 border-l-gray-400",
  completed: "border-l-4 border-l-gray-200",
};

function matchesFilter(lead: Lead, filter: FilterTab): boolean {
  switch (filter) {
    case "alle":
      return true;
    case "sofort":
      return (
        (["neu", "zugewiesen"].includes(lead.status) &&
          lead.kontaktversuche === 0) ||
        lead.sla_status === "active"
      );
    case "rueckruf":
      return (
        lead.status === "nicht_erreicht" || Boolean(lead.callback_at)
      );
    case "followup":
      return ["kontaktversuch", "qualifiziert", "nachfassen"].includes(
        lead.status
      );
    case "erledigt":
      return ["termin", "abschluss", "verloren", "show", "no_show"].includes(
        lead.status
      );
  }
}

export default function SetterWorkListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activitiesMap, setActivitiesMap] = useState<
    Record<string, Activity[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("alle");
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [outcomeLeadId, setOutcomeLeadId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("leads")
      .select(
        "*, berater:berater_id(id, profile_id, profiles:profile_id(full_name))"
      )
      .eq("setter_id", user.id)
      .order("created_at", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedLeads: Lead[] = (data ?? []).map((l: any) => ({
      ...l,
      berater_name: l.berater?.profiles
        ? (l.berater.profiles.full_name ?? null)
        : null,
      berater: undefined,
    }));

    setLeads(enrichedLeads);

    // Fetch activities for all leads
    const leadIds = enrichedLeads.map((l) => l.id);
    if (leadIds.length > 0) {
      const { data: allActivities } = await supabase
        .from("lead_activities")
        .select("*, profiles:created_by(full_name)")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });

      const map: Record<string, Activity[]> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const a of (allActivities ?? []) as any[]) {
        const activity: Activity = {
          ...a,
          created_by_name: a.profiles?.full_name ?? null,
          profiles: undefined,
        };
        if (!map[activity.lead_id]) map[activity.lead_id] = [];
        map[activity.lead_id].push(activity);
      }
      setActivitiesMap(map);
    }

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Compute scores and sort
  const scoredLeads = useMemo(() => {
    return leads.map((lead) => {
      const activities = activitiesMap[lead.id] ?? [];
      const score = calculateLeadScore(lead, activities);
      const priority = getPriorityCategory(lead);
      return { lead, score, priority, activities };
    });
  }, [leads, activitiesMap]);

  const filteredLeads = useMemo(() => {
    return scoredLeads
      .filter((item) => matchesFilter(item.lead, activeFilter))
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority];
        const pb = PRIORITY_ORDER[b.priority];
        if (pa !== pb) return pa - pb;
        return b.score.total - a.score.total;
      });
  }, [scoredLeads, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = leads.filter(
      (l) => !["abschluss", "verloren"].includes(l.status)
    ).length;

    const contactedToday = leads.filter((l) => {
      const activities = activitiesMap[l.id] ?? [];
      return activities.some(
        (a) =>
          a.type === "anruf" &&
          new Date(a.created_at).getTime() >= today.getTime()
      );
    }).length;

    const termine = leads.filter((l) => l.status === "termin").length;

    const contactRate =
      leads.length > 0
        ? Math.round(
            (leads.filter((l) => l.kontaktversuche > 0).length /
              leads.length) *
              100
          )
        : 0;

    return { active, contactedToday, termine, contactRate };
  }, [leads, activitiesMap]);

  const outcomeLead = outcomeLeadId
    ? leads.find((l) => l.id === outcomeLeadId) ?? null
    : null;

  async function handleStatusChange(
    leadId: string,
    newStatus: string,
    notiz?: string
  ) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setStatusLoadingId(leadId);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatusLoadingId(null);
      return;
    }

    await supabase
      .from("leads")
      .update({
        status: newStatus as Lead["status"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    const oldLabel = STATUS_CONFIG[lead.status as LeadState]?.label ?? lead.status;
    const newLabel = STATUS_CONFIG[newStatus as LeadState]?.label ?? newStatus;

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "status_change",
      title: "Status geändert",
      description: `Status geändert: ${oldLabel} \u2192 ${newLabel}${notiz ? ` - ${notiz}` : ""}`,
      old_value: lead.status,
      new_value: newStatus,
      created_by: user.id,
    });

    setStatusChangingId(null);
    setStatusLoadingId(null);
    await fetchLeads();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Headphones className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Arbeitsliste
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.active} Leads aktiv &bull; {stats.contactedToday}{" "}
              kontaktiert heute &bull; {stats.termine} Termine
            </p>
          </div>
        </div>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">
                Zugewiesene Leads
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <Phone className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.contactedToday}</p>
              <p className="text-xs text-muted-foreground">
                Kontaktiert heute
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <CalendarCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.termine}</p>
              <p className="text-xs text-muted-foreground">
                Termine gebucht
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.contactRate}%</p>
              <p className="text-xs text-muted-foreground">Kontaktrate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeFilter === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Lead Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Phone className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Keine Leads in dieser Ansicht.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(({ lead, score, priority, activities }) => (
            <Card
              key={lead.id}
              className={cn("overflow-hidden", PRIORITY_BORDER[priority])}
            >
              <CardContent className="p-4">
                {/* Card Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="text-lg font-semibold hover:underline text-left"
                        onClick={() =>
                          router.push(`/setter/leads/${lead.id}`)
                        }
                      >
                        {lead.vorname} {lead.nachname}
                      </button>
                      <LeadStatusBadge status={lead.status} />
                      {lead.zugewiesen_am && (
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(lead.zugewiesen_am)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {lead.telefon && (
                        <a
                          href={`tel:${lead.telefon}`}
                          className="hover:text-foreground"
                        >
                          {lead.telefon}
                        </a>
                      )}
                      {lead.email && (
                        <span className="truncate max-w-[200px]">
                          {lead.email}
                        </span>
                      )}
                      {lead.berater_name && (
                        <span>
                          Berater: {lead.berater_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SLA Timer */}
                  {lead.sla_deadline && lead.sla_status && (
                    <SlaTimer
                      deadline={lead.sla_deadline}
                      status={
                        lead.sla_status as
                          | "none"
                          | "active"
                          | "met"
                          | "breached"
                      }
                    />
                  )}
                </div>

                {/* AI Suggestion */}
                <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-sm font-medium">{score.nextAction}</p>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    &mdash; {score.reasoning}
                  </span>
                </div>

                {/* ActionBar */}
                <div className="mt-3">
                  <ActionBar
                    lead={{
                      id: lead.id,
                      telefon: lead.telefon,
                      email: lead.email,
                      vorname: lead.vorname,
                      nachname: lead.nachname,
                      opt_in_whatsapp: lead.opt_in_whatsapp,
                    }}
                    onCallComplete={() => setOutcomeLeadId(lead.id)}
                    onActionComplete={() => fetchLeads()}
                  />
                </div>

                {/* Inline Status Change */}
                {statusChangingId === lead.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Select
                      onValueChange={(val) => {
                        if (val) handleStatusChange(lead.id, val);
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Status wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getValidTransitions(
                          lead.status as LeadState,
                          "setter"
                        ).map(({ state, label }) => (
                          <SelectItem key={state} value={state}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {statusLoadingId === lead.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStatusChangingId(null)}
                    >
                      Abbrechen
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setStatusChangingId(lead.id)}
                    >
                      Status ändern
                    </Button>
                  </div>
                )}

                {/* Expandable Activity History */}
                <Collapsible
                  open={expandedLeadId === lead.id}
                  onOpenChange={(open) =>
                    setExpandedLeadId(open ? lead.id : null)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {expandedLeadId === lead.id ? (
                        <ChevronDown className="mr-1 h-3 w-3" />
                      ) : (
                        <ChevronRight className="mr-1 h-3 w-3" />
                      )}
                      Aktivitäten ({activities.length})
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 rounded-md border bg-muted/30 p-3">
                      <LeadActivityTimeline activities={activities} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Outcome Selector Modal */}
      {outcomeLead && (
        <OutcomeSelector
          leadId={outcomeLead.id}
          leadName={`${outcomeLead.vorname ?? ""} ${outcomeLead.nachname ?? ""}`.trim()}
          open={Boolean(outcomeLeadId)}
          onClose={() => setOutcomeLeadId(null)}
          onComplete={() => {
            setOutcomeLeadId(null);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
