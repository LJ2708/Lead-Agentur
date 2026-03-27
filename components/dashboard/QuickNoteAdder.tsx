"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface QuickNoteAdderProps {
  leadId: string;
  onComplete: () => void;
}

export function QuickNoteAdder({ leadId, onComplete }: QuickNoteAdderProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!note.trim()) {
      toast.error("Bitte eine Notiz eingeben");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("lead_activities").insert({
        lead_id: leadId,
        type: "notiz",
        title: "Notiz",
        description: note.trim(),
        created_by: user?.id ?? null,
      });

      if (error) throw error;

      toast.success("Notiz gespeichert");
      setNote("");
      onComplete();
    } catch {
      toast.error("Fehler beim Speichern der Notiz");
    } finally {
      setSaving(false);
    }
  }, [note, leadId, onComplete]);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <Textarea
        placeholder="Notiz hinzufügen..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="resize-none bg-background text-sm"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !note.trim()}
          className="h-8"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  );
}
