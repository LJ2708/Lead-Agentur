"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

interface BeraterFormData {
  vorname: string;
  nachname: string;
  telefon: string;
}

interface BeraterFormProps {
  initialData: BeraterFormData;
  onSubmit: (data: BeraterFormData) => Promise<void>;
  isLoading?: boolean;
}

export function BeraterForm({
  initialData,
  onSubmit,
  isLoading = false,
}: BeraterFormProps) {
  const [formData, setFormData] = useState<BeraterFormData>(initialData);

  function handleChange(field: keyof BeraterFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(formData);
  }

  const hasChanges =
    formData.vorname !== initialData.vorname ||
    formData.nachname !== initialData.nachname ||
    formData.telefon !== initialData.telefon;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vorname">Vorname</Label>
          <Input
            id="vorname"
            value={formData.vorname}
            onChange={(e) => handleChange("vorname", e.target.value)}
            placeholder="Vorname"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nachname">Nachname</Label>
          <Input
            id="nachname"
            value={formData.nachname}
            onChange={(e) => handleChange("nachname", e.target.value)}
            placeholder="Nachname"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefon">Telefon</Label>
        <Input
          id="telefon"
          type="tel"
          value={formData.telefon}
          onChange={(e) => handleChange("telefon", e.target.value)}
          placeholder="+49 ..."
        />
      </div>

      <Button type="submit" disabled={isLoading || !hasChanges}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
        ) : (
          <Save className="h-4 w-4" data-icon="inline-start" />
        )}
        {isLoading ? "Wird gespeichert..." : "Speichern"}
      </Button>
    </form>
  );
}
