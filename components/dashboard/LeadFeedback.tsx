"use client"

import { useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadFeedbackProps {
  leadId: string
  status: "abschluss" | "verloren"
  open: boolean
  onClose: () => void
}

interface FeedbackOption {
  value: string
  label: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ABSCHLUSS_OPTIONS: FeedbackOption[] = [
  { value: "guter_lead", label: "Guter Lead" },
  { value: "schneller_kontakt", label: "Schneller Kontakt" },
  { value: "gute_beratung", label: "Gute Beratung" },
  { value: "sonstiges", label: "Sonstiges" },
]

const VERLOREN_OPTIONS: FeedbackOption[] = [
  { value: "kein_interesse", label: "Kein Interesse" },
  { value: "falsche_zielgruppe", label: "Falsche Zielgruppe" },
  { value: "nicht_erreichbar", label: "Nicht erreichbar" },
  { value: "konkurrenz", label: "Konkurrenz" },
  { value: "budget", label: "Budget" },
  { value: "sonstiges", label: "Sonstiges" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadFeedback({
  leadId,
  status,
  open,
  onClose,
}: LeadFeedbackProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const options = status === "abschluss" ? ABSCHLUSS_OPTIONS : VERLOREN_OPTIONS
  const title =
    status === "abschluss"
      ? "Was hat zum Abschluss gef\u00fchrt?"
      : "Warum ging der Lead verloren?"

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return

    setSubmitting(true)
    try {
      const feedbackData = {
        reason: selectedReason,
        status,
        note: note.trim() || undefined,
      }

      const { error } = await supabase.from("lead_activities").insert({
        lead_id: leadId,
        type: "notiz" as const,
        title:
          status === "abschluss"
            ? "Abschluss-Feedback"
            : "Verloren-Feedback",
        description: JSON.stringify(feedbackData),
      })

      if (error) throw error

      toast.success("Feedback gespeichert")
      setSelectedReason(null)
      setNote("")
      onClose()
    } catch {
      toast.error("Feedback konnte nicht gespeichert werden")
    } finally {
      setSubmitting(false)
    }
  }, [selectedReason, note, status, leadId, supabase, onClose])

  const handleDismiss = useCallback(() => {
    setSelectedReason(null)
    setNote("")
    onClose()
  }, [onClose])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleDismiss() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Ihr Feedback hilft uns, die Lead-Qualit&auml;t zu verbessern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick select options */}
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedReason(option.value)}
                disabled={submitting}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedReason === option.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Optional free text */}
          {selectedReason && (
            <div>
              <Label htmlFor="feedback-note" className="text-sm">
                Notiz (optional)
              </Label>
              <Textarea
                id="feedback-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Weitere Details..."
                className="mt-1 min-h-[60px]"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={submitting}
          >
            &Uuml;berspringen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              "Feedback senden"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
