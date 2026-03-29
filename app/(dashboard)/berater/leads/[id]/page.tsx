"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeadStatusForm } from "@/components/forms/LeadStatusForm";
import { LeadActivityTimeline } from "@/components/dashboard/LeadActivityTimeline";
import { OutcomeSelector } from "@/components/dashboard/OutcomeSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Loader2,
  Star,
  PhoneCall,
} from "lucide-react";
import { formatDate, getStatusLabel, getStatusColor, cn } from "@/lib/utils";
import { calculateLeadScore, type LeadScore } from "@/lib/scoring/lead-score";
import { LeadComments } from "@/components/dashboard/LeadComments";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads">;
type Activity = Tables<"lead_activities"> & {
  created_by_name?: string | null;
};
type Nachricht = Tables<"nachrichten">;

export default function BeraterLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [beraterId, setBeraterId] = useState<string | null>(null);
  const [score, setScore] = useState<LeadScore | null>(null);

  // Termin form
  const [terminDatum, setTerminDatum] = useState("");
  const [terminZeit, setTerminZeit] = useState("");
  const [terminNotizen, setTerminNotizen] = useState("");
  const [isSubmittingTermin, setIsSubmittingTermin] = useState(false);

  // Outcome selector
  const [showOutcome, setShowOutcome] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get berater id
    const { data: berater } = await supabase
      .from("berater")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (berater) {
      setBeraterId(berater.id);
    }

    // Fetch lead
    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (!leadData) {
      router.push("/berater/leads");
      return;
    }
    setLead(leadData);

    // Fetch activities with creator names
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

    // Calculate score
    const leadScore = calculateLeadScore(leadData, enrichedActivities);
    setScore(leadScore);

    // Fetch nachrichten
    const { data: nachrichtenData } = await supabase
      .from("nachrichten")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    setNachrichten(nachrichtenData ?? []);

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(newStatus: string, notiz?: string) {
    if (!lead || !userId) return;

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
      title: "Status geaendert",
      description: `Status geaendert: ${getStatusLabel(lead.status)} \u2192 ${getStatusLabel(newStatus)}${notiz ? ` - ${notiz}` : ""}`,
      old_value: lead.status,
      new_value: newStatus,
      created_by: userId,
    });

    await fetchData();
  }

  async function handleTerminBuchen() {
    if (!lead || !userId || !beraterId || !terminDatum || !terminZeit) return;

    setIsSubmittingTermin(true);

    const dateTime = `${terminDatum}T${terminZeit}`;

    // Create termin
    await supabase.from("termine").insert({
      lead_id: lead.id,
      berater_id: beraterId,
      erstellt_von: userId,
      datum: new Date(dateTime).toISOString(),
      notizen: terminNotizen || null,
      dauer_minuten: 30,
      status: "geplant",
    });

    // Create activity
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "termin_gebucht",
      title: "Termin gebucht",
      description: `Termin gebucht am ${formatDate(dateTime)} um ${terminZeit} Uhr${terminNotizen ? ` - ${terminNotizen}` : ""}`,
      created_by: userId,
    });

    // Update lead status to termin if applicable
    if (["qualifiziert", "nachfassen"].includes(lead.status)) {
      await supabase
        .from("leads")
        .update({ status: "termin" as Lead["status"] })
        .eq("id", lead.id);
    }

    setTerminDatum("");
    setTerminZeit("");
    setTerminNotizen("");
    setIsSubmittingTermin(false);
    await fetchData();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!lead) return null;

  const CHANNEL_LABELS: Record<string, string> = {
    email: "E-Mail",
    whatsapp: "WhatsApp",
    sms: "SMS",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/berater/leads")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {lead.vorname} {lead.nachname}
            </h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                getStatusColor(lead.status)
              )}
            >
              {getStatusLabel(lead.status)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Lead-Details und Aktivitaeten
          </p>
        </div>

        {/* Lead Score */}
        {score && (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
            <Star className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold leading-none">{score.total}</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <Badge
              variant={
                score.priority === "hot"
                  ? "destructive"
                  : score.priority === "warm"
                    ? "default"
                    : "secondary"
              }
              className="ml-2"
            >
              {score.priority === "hot"
                ? "Hoch"
                : score.priority === "warm"
                  ? "Mittel"
                  : "Niedrig"}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Lead Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead-Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.telefon && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${lead.telefon}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.telefon}
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              {/* Meta Info */}
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Quelle:</span>{" "}
                  <span className="font-medium">{lead.source}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Erstellt am:</span>{" "}
                  <span className="font-medium">
                    {formatDate(lead.created_at)}
                  </span>
                </div>
                {lead.zugewiesen_am && (
                  <div>
                    <span className="text-muted-foreground">
                      Zugewiesen am:
                    </span>{" "}
                    <span className="font-medium">
                      {formatDate(lead.zugewiesen_am)}
                    </span>
                  </div>
                )}
                {lead.erster_kontakt_am && (
                  <div>
                    <span className="text-muted-foreground">
                      Erster Kontakt:
                    </span>{" "}
                    <span className="font-medium">
                      {formatDate(lead.erster_kontakt_am)}
                    </span>
                  </div>
                )}
                {lead.kontaktversuche > 0 && (
                  <div>
                    <span className="text-muted-foreground">
                      Kontaktversuche:
                    </span>{" "}
                    <span className="font-medium">{lead.kontaktversuche}</span>
                  </div>
                )}
                {lead.naechste_erinnerung && (
                  <div>
                    <span className="text-muted-foreground">
                      Naechste Erinnerung:
                    </span>{" "}
                    <span className="font-medium">
                      {formatDate(lead.naechste_erinnerung)}
                    </span>
                  </div>
                )}
              </div>

              {/* UTM / Campaign */}
              {(lead.utm_source || lead.utm_campaign) && (
                <>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-muted-foreground">
                      Kampagnen-Daten
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {lead.utm_source && (
                        <div>
                          <span className="text-muted-foreground">
                            Source:
                          </span>{" "}
                          {lead.utm_source}
                        </div>
                      )}
                      {lead.utm_medium && (
                        <div>
                          <span className="text-muted-foreground">
                            Medium:
                          </span>{" "}
                          {lead.utm_medium}
                        </div>
                      )}
                      {lead.utm_campaign && (
                        <div>
                          <span className="text-muted-foreground">
                            Kampagne:
                          </span>{" "}
                          {lead.utm_campaign}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Contact Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {lead.telefon && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`tel:${lead.telefon}`}>
                      <Phone className="h-3.5 w-3.5" data-icon="inline-start" />
                      Anrufen
                    </a>
                  </Button>
                )}
                {lead.telefon && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOutcome(true)}
                  >
                    <PhoneCall className="h-3.5 w-3.5" data-icon="inline-start" />
                    Anruf-Ergebnis
                  </Button>
                )}
                {lead.email && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${lead.email}`}>
                      <Mail className="h-3.5 w-3.5" data-icon="inline-start" />
                      E-Mail senden
                    </a>
                  </Button>
                )}
                {lead.telefon && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`https://wa.me/${lead.telefon.replace(/[^0-9+]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle
                        className="h-3.5 w-3.5"
                        data-icon="inline-start"
                      />
                      WhatsApp senden
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Nachrichten */}
          {nachrichten.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Nachrichten ({nachrichten.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {nachrichten.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "rounded-lg border p-3",
                        n.direction === "outbound"
                          ? "ml-6 bg-blue-50"
                          : "mr-6 bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {CHANNEL_LABELS[n.channel] ?? n.channel} -{" "}
                          {n.direction === "outbound" ? "Ausgehend" : "Eingehend"}
                        </Badge>
                        <span>{formatDate(n.created_at)}</span>
                      </div>
                      {n.subject && (
                        <p className="mt-1 text-sm font-medium">{n.subject}</p>
                      )}
                      {n.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {n.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktivitaeten</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lead Score Card */}
          {score && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead-Score Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Datenqualitaet</span>
                  <span className="font-medium">
                    {score.breakdown.dataQuality}/25
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dringlichkeit</span>
                  <span className="font-medium">
                    {score.breakdown.urgency}/25
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Engagement</span>
                  <span className="font-medium">
                    {score.breakdown.engagement}/25
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quellenqualitaet</span>
                  <span className="font-medium">
                    {score.breakdown.sourceQuality}/25
                  </span>
                </div>
                <Separator />
                <p className="text-sm">
                  <span className="font-medium">Empfehlung:</span>{" "}
                  {score.nextAction}
                </p>
                <p className="text-xs text-muted-foreground">
                  {score.reasoning}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Kontaktversuche */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontaktversuche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{lead.kontaktversuche}</p>
                  <p className="text-xs text-muted-foreground">
                    von max. {lead.max_kontaktversuche ?? 5}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status aendern</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadStatusForm
                leadId={leadId}
                currentStatus={lead.status}
                role="berater"
                onSubmit={handleStatusChange}
              />
            </CardContent>
          </Card>

          {/* Kontakt Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.telefon && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <a href={`tel:${lead.telefon}`}>
                    <Phone className="h-4 w-4" data-icon="inline-start" />
                    Anrufen
                  </a>
                </Button>
              )}
              {lead.email && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4" data-icon="inline-start" />
                    E-Mail senden
                  </a>
                </Button>
              )}
              {lead.telefon && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <a
                    href={`https://wa.me/${lead.telefon.replace(/[^0-9+]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle
                      className="h-4 w-4"
                      data-icon="inline-start"
                    />
                    WhatsApp senden
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Termin buchen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Termin buchen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Datum</Label>
                <Input
                  type="date"
                  value={terminDatum}
                  onChange={(e) => setTerminDatum(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Uhrzeit</Label>
                <Input
                  type="time"
                  value={terminZeit}
                  onChange={(e) => setTerminZeit(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Notizen (optional)</Label>
                <Textarea
                  value={terminNotizen}
                  onChange={(e) => setTerminNotizen(e.target.value)}
                  placeholder="Termin-Notizen..."
                  rows={2}
                />
              </div>
              <Button
                onClick={handleTerminBuchen}
                disabled={!terminDatum || !terminZeit || isSubmittingTermin}
                className="w-full"
                size="sm"
              >
                {isSubmittingTermin ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <Calendar className="h-4 w-4" data-icon="inline-start" />
                )}
                Termin buchen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team-Kommentare */}
      <LeadComments leadId={leadId} />

      {/* Outcome Selector Modal */}
      {showOutcome && lead && (
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
      )}
    </div>
  );
}
