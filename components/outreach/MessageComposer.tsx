"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Send, CalendarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/types/database";

type Prospect = Tables<"outreach_prospects">;
type Template = Tables<"outreach_templates">;

interface MessageComposerProps {
  prospect: Prospect;
  onSent: () => void;
}

const TYPE_BY_CONTACT_COUNT: Record<number, string> = {
  0: "linkedin_connect",
  1: "linkedin_followup_1",
  2: "linkedin_followup_2",
  3: "linkedin_followup_3",
};

function replaceVariables(body: string, prospect: Prospect): string {
  return body
    .replace(/\{\{name\}\}/g, prospect.full_name ?? "")
    .replace(/\{\{company\}\}/g, prospect.company ?? "")
    .replace(/\{\{city\}\}/g, prospect.city ?? "")
    .replace(/\{\{position\}\}/g, prospect.position ?? "");
}

export function MessageComposer({ prospect, onSent }: MessageComposerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customFollowup, setCustomFollowup] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("outreach_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) {
      setTemplates(data);
      // Auto-suggest template based on contact_count
      const suggestedType = TYPE_BY_CONTACT_COUNT[prospect.contact_count];
      if (suggestedType) {
        const match = data.find((t) => t.type === suggestedType);
        if (match) {
          setSelectedTemplateId(match.id);
          return;
        }
      }
      if (data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    }
  }, [prospect.contact_count]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const previewText = useMemo(() => {
    if (!selectedTemplate) return "";
    return replaceVariables(selectedTemplate.body, prospect);
  }, [selectedTemplate, prospect]);

  async function handleCopy() {
    await navigator.clipboard.writeText(previewText);
    toast.success("Kopiert! F\u00fcge die Nachricht in LinkedIn ein.");
  }

  async function handleMarkAsSent() {
    setSending(true);
    const supabase = createClient();

    const now = new Date().toISOString();
    const followupDate = customFollowup
      ? new Date(customFollowup).toISOString()
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    // Create activity
    await supabase.from("outreach_activities").insert({
      prospect_id: prospect.id,
      type: "nachricht",
      title: selectedTemplate
        ? `Nachricht gesendet: ${selectedTemplate.name}`
        : "Nachricht gesendet",
      description: previewText || null,
      template_used: selectedTemplate?.name ?? null,
    });

    // Update prospect
    const updates: Record<string, unknown> = {
      contact_count: prospect.contact_count + 1,
      last_contacted_at: now,
      next_followup_at: followupDate,
    };

    if (prospect.status === "neu") {
      updates.status = "kontaktiert";
    }

    await supabase
      .from("outreach_prospects")
      .update(updates)
      .eq("id", prospect.id);

    setSending(false);
    toast.success("Als gesendet markiert.");
    onSent();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Vorlage</Label>
        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
          <SelectTrigger>
            <SelectValue placeholder="Vorlage w\u00e4hlen..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Vorschau</Label>
        <Textarea
          readOnly
          value={previewText}
          rows={8}
          className="bg-muted/50 text-sm"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="custom_followup">
          <CalendarIcon className="mr-1 inline h-4 w-4" />
          N\u00e4chstes Follow-up (optional)
        </Label>
        <Input
          id="custom_followup"
          type="date"
          value={customFollowup}
          onChange={(e) => setCustomFollowup(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCopy}
          disabled={!previewText}
        >
          <Copy className="mr-2 h-4 w-4" />
          Nachricht kopieren
        </Button>
        <Button
          className="flex-1"
          onClick={handleMarkAsSent}
          disabled={sending}
        >
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Speichere..." : "Als gesendet markieren"}
        </Button>
      </div>
    </div>
  );
}
