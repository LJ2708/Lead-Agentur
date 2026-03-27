"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeadDetail } from "@/components/dashboard/LeadDetail";
import { LeadStatusForm } from "@/components/forms/LeadStatusForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Loader2,
  Send,
} from "lucide-react";
import { formatDate, getStatusLabel } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads">;
type Activity = Tables<"lead_activities"> & {
  created_by_name?: string | null;
};

export default function BeraterLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [beraterId, setBeraterId] = useState<string | null>(null);

  // Note form
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Termin form
  const [terminDatum, setTerminDatum] = useState("");
  const [terminNotizen, setTerminNotizen] = useState("");
  const [isSubmittingTermin, setIsSubmittingTermin] = useState(false);

  // Kontaktversuche count
  const [kontaktversucheCount, setKontaktversucheCount] = useState(0);

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

    // Count kontaktversuche
    const kontaktversuche = (activitiesData ?? []).filter(
      (a: { type: string }) => a.type === "anruf"
    ).length;
    setKontaktversucheCount(kontaktversuche);

    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(newStatus: string, notiz?: string) {
    if (!lead || !userId) return;

    // Update lead status
    await supabase
      .from("leads")
      .update({
        status: newStatus as Lead["status"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    // Create activity
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "status_change",
      title: "Status geändert",
      description: `Status geändert: ${getStatusLabel(lead.status)} → ${getStatusLabel(newStatus)}${notiz ? ` - ${notiz}` : ""}`,
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

  async function handleTerminBuchen() {
    if (!lead || !userId || !beraterId || !terminDatum) return;

    setIsSubmittingTermin(true);

    // Create termin
    await supabase.from("termine").insert({
      lead_id: lead.id,
      berater_id: beraterId,
      erstellt_von: userId,
      datum: new Date(terminDatum).toISOString(),
      notizen: terminNotizen || null,
      dauer_minuten: 30,
      status: "geplant",
    });

    // Create activity
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "termin_gebucht",
      title: "Termin gebucht",
      description: `Termin gebucht am ${formatDate(terminDatum)}${terminNotizen ? ` - ${terminNotizen}` : ""}`,
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {lead.vorname} {lead.nachname}
          </h1>
          <p className="text-sm text-muted-foreground">
            Lead-Details und Aktivitaeten
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Lead detail + timeline */}
        <div className="lg:col-span-2">
          <LeadDetail
            lead={lead}
            activities={activities}
            onStatusChange={handleStatusChange}
            onAddNote={handleAddNote}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                  <p className="text-2xl font-bold">{kontaktversucheCount}</p>
                  <p className="text-xs text-muted-foreground">
                    Anrufe insgesamt
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status ändern</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadStatusForm
                currentStatus={lead.status}
                role="berater"
                onSubmit={handleStatusChange}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.telefon && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={`tel:${lead.telefon}`}>
                    <Phone className="h-4 w-4" data-icon="inline-start" />
                    Anrufen
                  </a>
                </Button>
              )}
              {lead.email && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4" data-icon="inline-start" />
                    E-Mail senden
                  </a>
                </Button>
              )}
              {lead.telefon && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <a
                    href={`https://wa.me/${lead.telefon.replace(/[^0-9+]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" data-icon="inline-start" />
                    WhatsApp senden
                  </a>
                </Button>
              )}
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

          {/* Termin buchen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Termin buchen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Datum & Uhrzeit</Label>
                <Input
                  type="datetime-local"
                  value={terminDatum}
                  onChange={(e) => setTerminDatum(e.target.value)}
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
                disabled={!terminDatum || isSubmittingTermin}
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
    </div>
  );
}
