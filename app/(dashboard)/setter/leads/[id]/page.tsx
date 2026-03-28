"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { KontaktversuchTracker } from "@/components/dashboard/KontaktversuchTracker";
import { calculateLeadScore } from "@/lib/scoring/lead-score";
import {
  getValidTransitions,
  STATUS_CONFIG,
  type LeadState,
} from "@/lib/leads/state-machine";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  User,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads">;
type Activity = Tables<"lead_activities"> & {
  created_by_name?: string | null;
};

interface BeraterInfo {
  full_name: string | null;
  email: string;
  phone: string | null;
}

export default function SetterLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [beraterInfo, setBeraterInfo] = useState<BeraterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Outcome selector
  const [showOutcome, setShowOutcome] = useState(false);

  // Note form
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Status change
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Fetch lead
    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (!leadData) {
      router.push("/setter");
      return;
    }
    setLead(leadData);

    // Fetch berater info
    if (leadData.berater_id) {
      const { data: berater } = await supabase
        .from("berater")
        .select("profile_id, profiles:profile_id(full_name, email, phone)")
        .eq("id", leadData.berater_id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (berater && (berater as any).profiles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = (berater as any).profiles;
        setBeraterInfo({
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
        });
      }
    }

    // Fetch activities
    const { data: activitiesData } = await supabase
      .from("lead_activities")
      .select("*, profiles:created_by(full_name)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    const enrichedActivities: Activity[] = (activitiesData ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => ({
        ...a,
        created_by_name: a.profiles?.full_name ?? null,
        profiles: undefined,
      })
    );
    setActivities(enrichedActivities);

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const score = lead ? calculateLeadScore(lead, activities) : null;

  async function handleStatusChange(newStatus: string) {
    if (!lead || !userId) return;

    setStatusLoading(true);

    const oldLabel = STATUS_CONFIG[lead.status as LeadState]?.label ?? lead.status;
    const newLabel = STATUS_CONFIG[newStatus as LeadState]?.label ?? newStatus;

    await supabase
      .from("leads")
      .update({
        status: newStatus as Lead["status"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "status_change",
      title: "Status geändert",
      description: `Status geändert: ${oldLabel} \u2192 ${newLabel}`,
      old_value: lead.status,
      new_value: newStatus,
      created_by: userId,
    });

    setStatusLoading(false);
    await fetchData();
  }

  async function handleAddNote() {
    if (!lead || !userId || !noteText.trim()) return;

    setIsSubmittingNote(true);
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "notiz",
      title: "Notiz",
      description: noteText.trim(),
      created_by: userId,
    });

    setNoteText("");
    setIsSubmittingNote(false);
    await fetchData();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lead) return null;

  const validTransitions = getValidTransitions(
    lead.status as LeadState,
    "setter"
  );
  const phoneClean = lead.telefon?.replace(/[^0-9+]/g, "") ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/setter")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {lead.vorname} {lead.nachname}
            </h1>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Setter-Ansicht &mdash; Lead bearbeiten
          </p>
        </div>
        {lead.sla_deadline && lead.sla_status && (
          <SlaTimer
            deadline={lead.sla_deadline}
            status={
              lead.sla_status as "none" | "active" | "met" | "breached"
            }
          />
        )}
      </div>

      {/* Contact Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Phone */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  lead.telefon
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                {lead.telefon ? (
                  <a
                    href={`tel:${phoneClean}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {lead.telefon}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  lead.email
                    ? "bg-purple-100 text-purple-600"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-Mail</p>
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm font-medium text-purple-600 hover:underline"
                  >
                    {lead.email}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  lead.opt_in_whatsapp && lead.telefon
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm font-medium">
                  {lead.opt_in_whatsapp && lead.telefon
                    ? "Opt-in erteilt"
                    : "Nicht verfügbar"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ActionBar - Full width, large */}
      <Card>
        <CardContent className="p-4">
          <ActionBar
            lead={{
              id: lead.id,
              telefon: lead.telefon,
              email: lead.email,
              vorname: lead.vorname,
              nachname: lead.nachname,
              opt_in_whatsapp: lead.opt_in_whatsapp,
            }}
            onCallComplete={() => setShowOutcome(true)}
            onActionComplete={() => fetchData()}
          />
        </CardContent>
      </Card>

      {/* Kontaktversuch Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontaktversuche</CardTitle>
        </CardHeader>
        <CardContent>
          <KontaktversuchTracker
            leadId={lead.id}
            kontaktversuche={lead.kontaktversuche}
            maxKontaktversuche={lead.max_kontaktversuche ?? 5}
            onAttemptLogged={() => fetchData()}
          />
          {lead.kontaktversuche >= (lead.max_kontaktversuche ?? 5) && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange("qualifiziert")}
                disabled={statusLoading}
              >
                Als qualifiziert weitergeben
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange("nicht_erreicht")}
                disabled={statusLoading}
              >
                Nicht erreicht
              </Button>
            </div>
          )}
          {/* Contact attempt history */}
          {activities.filter((a) => a.type === "anruf").length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Kontaktversuch-Verlauf
              </p>
              <div className="space-y-1">
                {activities
                  .filter((a) => a.type === "anruf")
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-1.5 text-xs"
                    >
                      <span>{a.description ?? a.title}</span>
                      <span className="text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestion */}
      {score && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold">{score.nextAction}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {score.reasoning}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Berater Info */}
          {beraterInfo && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Berater</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">
                  {beraterInfo.full_name ?? "Unbekannt"}
                </p>
                <p className="text-muted-foreground">{beraterInfo.email}</p>
                {beraterInfo.phone && (
                  <p className="text-muted-foreground">
                    {beraterInfo.phone}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Status Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status ändern</CardTitle>
            </CardHeader>
            <CardContent>
              {validTransitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine Statusänderung möglich.
                </p>
              ) : (
                <div className="space-y-3">
                  <Select
                    onValueChange={(val) => {
                      if (val) handleStatusChange(val);
                    }}
                    disabled={statusLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Neuen Status wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {validTransitions.map(({ state, label }) => (
                        <SelectItem key={state} value={state}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {statusLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Quelle:</span>{" "}
                <span className="font-medium">{lead.source}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Kontaktversuche:
                </span>{" "}
                <span className="font-medium">{lead.kontaktversuche}</span>
              </div>
              {lead.callback_at && (
                <div>
                  <span className="text-muted-foreground">
                    Rückruf geplant:
                  </span>{" "}
                  <span className="font-medium">
                    {new Date(lead.callback_at).toLocaleString("de-DE")}
                  </span>
                </div>
              )}
              {lead.termin_am && (
                <div>
                  <span className="text-muted-foreground">Termin:</span>{" "}
                  <span className="font-medium">
                    {new Date(lead.termin_am).toLocaleString("de-DE")}
                  </span>
                </div>
              )}
              {lead.custom_fields && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 font-medium text-muted-foreground">
                      Zusätzliche Felder
                    </p>
                    <p className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(lead.custom_fields, null, 2)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Note - always visible at bottom */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Notiz eingeben..."
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={handleAddNote}
              disabled={!noteText.trim() || isSubmittingNote}
              className="self-end"
            >
              {isSubmittingNote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outcome Selector */}
      <OutcomeSelector
        leadId={lead.id}
        leadName={`${lead.vorname ?? ""} ${lead.nachname ?? ""}`.trim()}
        open={showOutcome}
        onClose={() => setShowOutcome(false)}
        onComplete={() => {
          setShowOutcome(false);
          fetchData();
        }}
      />
    </div>
  );
}
