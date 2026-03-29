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
import {
  getValidTransitions,
  STATUS_CONFIG,
  type LeadState,
} from "@/lib/leads/state-machine";
import { LeadFeedback } from "@/components/dashboard/LeadFeedback";

const DESTRUCTIVE_STATUSES: LeadState[] = ["verloren"];

interface LeadStatusFormProps {
  leadId?: string;
  currentStatus: string;
  role: "admin" | "berater" | "setter";
  onSubmit: (newStatus: string, notiz?: string) => Promise<void>;
}

export function LeadStatusForm({
  leadId,
  currentStatus,
  role,
  onSubmit,
}: LeadStatusFormProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [notiz, setNotiz] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<"abschluss" | "verloren" | null>(null);

  const validTransitions = getValidTransitions(currentStatus as LeadState, role);

  if (validTransitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine Statusänderung möglich.
      </p>
    );
  }

  async function handleSubmit() {
    if (!selectedStatus) return;

    // Check if destructive
    if (
      DESTRUCTIVE_STATUSES.includes(selectedStatus as LeadState) &&
      !showConfirm
    ) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(selectedStatus, notiz || undefined);
      const finalStatus = selectedStatus;
      setSelectedStatus("");
      setNotiz("");
      setShowConfirm(false);
      // Show feedback modal for terminal statuses
      if (leadId && (finalStatus === "abschluss" || finalStatus === "verloren")) {
        setFeedbackStatus(finalStatus as "abschluss" | "verloren");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const selectedLabel =
    STATUS_CONFIG[selectedStatus as LeadState]?.label ?? selectedStatus;

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
              <SelectValue placeholder="Status wählen..." />
            </SelectTrigger>
            <SelectContent>
              {validTransitions.map(({ state, label }) => (
                <SelectItem key={state} value={state}>
                  {label}
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
            placeholder="Notiz zur Statusänderung..."
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
          Status ändern
        </Button>
      </div>

      {/* Confirmation dialog for destructive statuses */}
      <Dialog open={showConfirm} onOpenChange={(open) => !open && setShowConfirm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Status bestätigen
            </DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie den Status auf &quot;{selectedLabel}
              &quot; ändern möchten? Diese Aktion markiert den Lead als
              verloren.
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
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback modal after abschluss/verloren */}
      {leadId && feedbackStatus && (
        <LeadFeedback
          leadId={leadId}
          status={feedbackStatus}
          open={!!feedbackStatus}
          onClose={() => setFeedbackStatus(null)}
        />
      )}
    </>
  );
}
