"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type CallResult =
  | "erreicht"
  | "nicht_erreicht"
  | "mailbox"
  | "termin_vereinbart";

interface QuickCallLoggerProps {
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  onComplete: () => void;
}

export function QuickCallLogger({
  leadId,
  leadName,
  leadPhone,
  onComplete,
}: QuickCallLoggerProps) {
  const [result, setResult] = useState<CallResult | "">("");
  const [note, setNote] = useState("");
  const [terminDate, setTerminDate] = useState("");
  const [terminTime, setTerminTime] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!result) {
      toast.error("Bitte Ergebnis ausw\u00e4hlen");
      return;
    }

    if (result === "termin_vereinbart" && (!terminDate || !terminTime)) {
      toast.error("Bitte Datum und Uhrzeit f\u00fcr den Termin angeben");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Determine new status based on result
      let newStatus: string;
      let activityTitle: string;

      switch (result) {
        case "erreicht":
          newStatus = "kontaktversuch";
          activityTitle = "Anruf \u2013 Erreicht";
          break;
        case "nicht_erreicht":
          newStatus = "nicht_erreicht";
          activityTitle = "Anruf \u2013 Nicht erreicht";
          break;
        case "mailbox":
          newStatus = "nicht_erreicht";
          activityTitle = "Anruf \u2013 Mailbox";
          break;
        case "termin_vereinbart":
          newStatus = "termin";
          activityTitle = "Anruf \u2013 Termin vereinbart";
          break;
      }

      // Create activity
      const { error: activityError } = await supabase
        .from("lead_activities")
        .insert({
          lead_id: leadId,
          type: "anruf",
          title: activityTitle,
          description: note || null,
          created_by: user?.id ?? null,
        });

      if (activityError) throw activityError;

      // Update lead status and increment kontaktversuche
      const updateData: Record<string, unknown> = {
        status: newStatus,
        kontaktversuche: undefined, // Will be handled by RPC or raw increment
      };

      // Fetch current kontaktversuche to increment
      const { data: currentLead } = await supabase
        .from("leads")
        .select("kontaktversuche, erster_kontakt_am")
        .eq("id", leadId)
        .single();

      const newKontaktversuche = (currentLead?.kontaktversuche ?? 0) + 1;
      updateData.kontaktversuche = newKontaktversuche;

      // Set erster_kontakt_am if not set
      if (!currentLead?.erster_kontakt_am) {
        updateData.erster_kontakt_am = new Date().toISOString();
      }

      // If termin_vereinbart, also set termin_am
      if (result === "termin_vereinbart" && terminDate && terminTime) {
        updateData.termin_am = new Date(
          `${terminDate}T${terminTime}`
        ).toISOString();
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (updateError) throw updateError;

      // If termin, also create termine record
      if (result === "termin_vereinbart" && terminDate && terminTime) {
        const { data: lead } = await supabase
          .from("leads")
          .select("berater_id")
          .eq("id", leadId)
          .single();

        if (lead?.berater_id) {
          await supabase.from("termine").insert({
            lead_id: leadId,
            berater_id: lead.berater_id,
            datum: new Date(`${terminDate}T${terminTime}`).toISOString(),
            status: "geplant",
            notizen: note || null,
            erstellt_von: user?.id ?? null,
          });
        }
      }

      toast.success(`Anruf f\u00fcr ${leadName} gespeichert`);
      onComplete();
    } catch {
      toast.error("Fehler beim Speichern des Anrufs");
    } finally {
      setSaving(false);
    }
  }, [result, note, terminDate, terminTime, leadId, leadName, onComplete]);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      {/* Click to call */}
      {leadPhone && (
        <a
          href={`tel:${leadPhone}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <Phone className="h-3.5 w-3.5" />
          {leadPhone}
        </a>
      )}

      {/* Result + Note row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-[180px]">
          <Select
            value={result}
            onValueChange={(val) => setResult(val as CallResult)}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="Ergebnis..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="erreicht">Erreicht</SelectItem>
              <SelectItem value="nicht_erreicht">Nicht erreicht</SelectItem>
              <SelectItem value="mailbox">Mailbox</SelectItem>
              <SelectItem value="termin_vereinbart">
                Termin vereinbart
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          placeholder="Kurze Notiz..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-9 flex-1 bg-background"
        />

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !result}
          className="h-9 shrink-0"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>

      {/* Termin date/time (conditional) */}
      {result === "termin_vereinbart" && (
        <div className="flex gap-2">
          <Input
            type="date"
            value={terminDate}
            onChange={(e) => setTerminDate(e.target.value)}
            className="h-9 bg-background"
          />
          <Input
            type="time"
            value={terminTime}
            onChange={(e) => setTerminTime(e.target.value)}
            className="h-9 bg-background"
          />
        </div>
      )}
    </div>
  );
}
