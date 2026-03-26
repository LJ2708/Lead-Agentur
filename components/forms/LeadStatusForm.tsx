"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getStatusLabel } from "@/lib/utils";
import type { Database } from "@/types/database";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const BERATER_TRANSITIONS: Record<string, LeadStatus[]> = {
  zugewiesen: ["kontaktversuch", "nicht_erreicht"],
  kontaktversuch: ["qualifiziert", "nicht_erreicht", "nachfassen"],
  qualifiziert: ["termin", "nachfassen", "verloren"],
  termin: ["show", "no_show"],
  show: ["abschluss", "nachfassen"],
  no_show: ["nachfassen", "verloren"],
  nachfassen: ["kontaktversuch", "termin", "verloren"],
};

const SETTER_TRANSITIONS: Record<string, LeadStatus[]> = {
  zugewiesen: ["kontaktversuch", "nicht_erreicht"],
  kontaktversuch: ["qualifiziert", "nicht_erreicht", "termin"],
  nicht_erreicht: ["kontaktversuch"],
  qualifiziert: ["termin"],
};

const DESTRUCTIVE_STATUSES: LeadStatus[] = ["verloren"];

interface LeadStatusFormProps {
  currentStatus: string;
  role: "berater" | "setter";
  onSubmit: (newStatus: string, notiz?: string) => Promise<void>;
}

export function LeadStatusForm({
  currentStatus,
  role,
  onSubmit,
}: LeadStatusFormProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [notiz, setNotiz] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const transitions =
    role === "berater" ? BERATER_TRANSITIONS : SETTER_TRANSITIONS;
  const validStatuses = transitions[currentStatus] ?? [];

  if (validStatuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine Statusaenderung moeglich.
      </p>
    );
  }

  async function handleSubmit() {
    if (!selectedStatus) return;

    // Check if destructive
    if (
      DESTRUCTIVE_STATUSES.includes(selectedStatus as LeadStatus) &&
      !showConfirm
    ) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(selectedStatus, notiz || undefined);
      setSelectedStatus("");
      setNotiz("");
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Neuer Status</Label>
          <Select
            value={selectedStatus}
            onValueChange={(val) => setSelectedStatus(val ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status waehlen..." />
            </SelectTrigger>
            <SelectContent>
              {validStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Notiz (optional)</Label>
          <Textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Notiz zur Statusaenderung..."
            rows={2}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedStatus || isLoading}
          className="w-full"
        >
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
          )}
          Status aendern
        </Button>
      </div>

      {/* Confirmation dialog for destructive statuses */}
      <Dialog open={showConfirm} onOpenChange={(open) => !open && setShowConfirm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Status bestaetigen
            </DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie den Status auf &quot;
              {getStatusLabel(selectedStatus)}&quot; aendern moechten? Diese
              Aktion markiert den Lead als verloren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Bestaetigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
