"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeadDetail } from "@/components/dashboard/LeadDetail";
import { LeadStatusForm } from "@/components/forms/LeadStatusForm";
import { LeadActivityTimeline } from "@/components/dashboard/LeadActivityTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Loader2,
  Send,
  User,
} from "lucide-react";
import { formatDate, getStatusLabel, getStatusColor, cn } from "@/lib/utils";
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

  // Note form
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Call log
  const [isLoggingCall, setIsLoggingCall] = useState(false);

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

      if (berater && (berater as any).profiles) {
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
      (a: any) => ({
        ...a,
        created_by_name: a.profiles?.full_name ?? null,
        profiles: undefined,
      })
    );
    setActivities(enrichedActivities);

    setIsLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(newStatus: string, notiz?: string) {
    if (!lead || !userId) return;

    await supabase
      .from("leads")
      .update({
        status: newStatus as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "status_change",
      title: "Status geaendert",
      description: `Status geaendert: ${getStatusLabel(lead.status)} → ${getStatusLabel(newStatus)}${notiz ? ` - ${notiz}` : ""}`,
      old_value: lead.status,
      new_value: newStatus,
      created_by: userId,
    });

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

  async function handleLogCall() {
    if (!lead || !userId) return;

    setIsLoggingCall(true);
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "anruf",
      title: "Anruf",
      description: "Anrufversuch durchgefuehrt",
      created_by: userId,
    });

    // Update letzter_kontakt
    await supabase
      .from("leads")
      .update({
        erster_kontakt_am: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    setIsLoggingCall(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/setter")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {lead.vorname} {lead.nachname}
          </h1>
          <p className="text-sm text-muted-foreground">
            Setter-Ansicht: Lead bearbeiten
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Lead Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Lead-Informationen</CardTitle>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    getStatusColor(lead.status)
                  )}
                >
                  {getStatusLabel(lead.status)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">
                    {lead.vorname} {lead.nachname}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">E-Mail:</span>{" "}
                  <span className="font-medium">{lead.email}</span>
                </div>
                {lead.telefon && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Telefon:</span>{" "}
                    <a
                      href={`tel:${lead.telefon}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {lead.telefon}
                    </a>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Quelle:</span>{" "}
                  <span className="font-medium">{lead.source}</span>
                </div>
              </div>

              {lead.custom_fields && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <p className="mb-1 font-medium text-muted-foreground">
                      Zusaetzliche Felder
                    </p>
                    <p className="whitespace-pre-wrap">{JSON.stringify(lead.custom_fields, null, 2)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitaeten</CardTitle>
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

          {/* Status Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status aendern</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadStatusForm
                currentStatus={lead.status}
                role="setter"
                onSubmit={handleStatusChange}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.telefon && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    render={<a href={`tel:${lead.telefon}`} />}
                    onClick={handleLogCall}
                  >
                    <Phone className="h-4 w-4" data-icon="inline-start" />
                    Anrufen
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    render={
                      <a
                        href={`https://wa.me/${lead.telefon.replace(/[^0-9+]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <MessageCircle
                      className="h-4 w-4"
                      data-icon="inline-start"
                    />
                    WhatsApp senden
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLogCall}
                disabled={isLoggingCall}
              >
                {isLoggingCall ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <Phone className="h-4 w-4" data-icon="inline-start" />
                )}
                Anruf protokollieren
              </Button>
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notiz hinzufuegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Notiz eingeben..."
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={!noteText.trim() || isSubmittingNote}
                className="w-full"
                size="sm"
              >
                {isSubmittingNote ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <Send className="h-4 w-4" data-icon="inline-start" />
                )}
                Notiz speichern
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
