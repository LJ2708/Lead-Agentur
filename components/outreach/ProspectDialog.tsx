"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type Prospect = Tables<"outreach_prospects">;

interface ProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: Prospect | null;
  onSaved: () => void;
}

const SOURCES = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "empfehlung", label: "Empfehlung" },
  { value: "website", label: "Website" },
  { value: "messe", label: "Messe" },
  { value: "kaltakquise", label: "Kaltakquise" },
  { value: "sonstige", label: "Sonstige" },
];

function extractNameFromLinkedIn(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const inIdx = parts.indexOf("in");
    if (inIdx !== -1 && parts[inIdx + 1]) {
      const slug = parts[inIdx + 1];
      return slug
        .replace(/-\w{4,10}$/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  } catch {
    // ignore invalid URL
  }
  return "";
}

export function ProspectDialog({
  open,
  onOpenChange,
  prospect,
  onSaved,
}: ProspectDialogProps) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState("linkedin");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = !!prospect;

  useEffect(() => {
    if (prospect) {
      setFullName(prospect.full_name);
      setCompany(prospect.company ?? "");
      setPosition(prospect.position ?? "");
      setLinkedinUrl(prospect.linkedin_url ?? "");
      setEmail(prospect.email ?? "");
      setPhone(prospect.phone ?? "");
      setCity(prospect.city ?? "");
      setSource(prospect.source ?? "linkedin");
      setNotes(prospect.notes ?? "");
      setTags((prospect.tags ?? []).join(", "));
    } else {
      setFullName("");
      setCompany("");
      setPosition("");
      setLinkedinUrl("");
      setEmail("");
      setPhone("");
      setCity("");
      setSource("linkedin");
      setNotes("");
      setTags("");
    }
  }, [prospect, open]);

  function handleLinkedInPaste(value: string) {
    setLinkedinUrl(value);
    if (value && !fullName) {
      const extracted = extractNameFromLinkedIn(value);
      if (extracted) {
        setFullName(extracted);
      }
    }
  }

  async function handleSave() {
    if (!fullName.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const data = {
      full_name: fullName.trim(),
      company: company.trim() || null,
      position: position.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      city: city.trim() || null,
      source,
      notes: notes.trim() || null,
      tags: tagsArray,
    };

    if (isEdit && prospect) {
      await supabase
        .from("outreach_prospects")
        .update(data)
        .eq("id", prospect.id);
    } else {
      await supabase.from("outreach_prospects").insert(data);
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Prospect bearbeiten" : "Neuer Prospect"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Bearbeite die Daten des Prospects."
              : "Erfasse einen neuen Prospect f\u00fcr die Outreach-Pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              placeholder="https://linkedin.com/in/max-mustermann"
              value={linkedinUrl}
              onChange={(e) => handleLinkedInPaste(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="full_name">Name *</Label>
            <Input
              id="full_name"
              placeholder="Max Mustermann"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company">Unternehmen</Label>
              <Input
                id="company"
                placeholder="Firma GmbH"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                placeholder="Finanzberater"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="max@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                placeholder="+49 123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">Stadt</Label>
              <Input
                id="city"
                placeholder="Berlin"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source">Quelle</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (kommagetrennt)</Label>
            <Input
              id="tags"
              placeholder="Finanzberater, M\u00fcnchen, Premium"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              placeholder="Weitere Informationen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
            {saving ? "Speichere..." : isEdit ? "Aktualisieren" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
