"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  PhoneMissed,
  AlertTriangle,
  PhoneForwarded,
  ThumbsDown,
  CalendarCheck,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ContactOutcome =
  | "reached"
  | "not_reached"
  | "invalid"
  | "callback"
  | "not_interested"
  | "appointment"

interface OutcomeOption {
  key: ContactOutcome
  label: string
  icon: React.ReactNode
  bgClass: string
  needsDateTime?: "callback" | "appointment"
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    key: "reached",
    label: "Erreicht",
    icon: <CheckCircle className="h-6 w-6" />,
    bgClass: "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100",
  },
  {
    key: "not_reached",
    label: "Nicht erreicht",
    icon: <PhoneMissed className="h-6 w-6" />,
    bgClass: "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100",
  },
  {
    key: "invalid",
    label: "Ungültige Nummer",
    icon: <AlertTriangle className="h-6 w-6" />,
    bgClass: "bg-red-50 border-red-200 text-red-800 hover:bg-red-100",
  },
  {
    key: "callback",
    label: "Rückruf vereinbart",
    icon: <PhoneForwarded className="h-6 w-6" />,
    bgClass: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100",
    needsDateTime: "callback",
  },
  {
    key: "not_interested",
    label: "Kein Interesse",
    icon: <ThumbsDown className="h-6 w-6" />,
    bgClass: "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100",
  },
  {
    key: "appointment",
    label: "Termin vereinbart",
    icon: <CalendarCheck className="h-6 w-6" />,
    bgClass: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100",
    needsDateTime: "appointment",
  },
]

interface OutcomeSelectorProps {
  leadId: string
  leadName: string
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export function OutcomeSelector({
  leadId,
  leadName,
  open,
  onClose,
  onComplete,
}: OutcomeSelectorProps) {
  const [selected, setSelected] = useState<ContactOutcome | null>(null)
  const [note, setNote] = useState("")
  const [callbackAt, setCallbackAt] = useState("")
  const [terminAt, setTerminAt] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const selectedOption = OUTCOME_OPTIONS.find((o) => o.key === selected)

  const handleSelect = useCallback((key: ContactOutcome) => {
    setSelected(key)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!selected) return

    setSubmitting(true)
    try {
      const body: Record<string, string> = { outcome: selected }
      if (note.trim()) body.note = note.trim()
      if (selected === "callback" && callbackAt) body.callback_at = new Date(callbackAt).toISOString()
      if (selected === "appointment" && terminAt) body.termin_at = new Date(terminAt).toISOString()

      const res = await fetch(`/api/leads/${leadId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error ?? "Fehler beim Speichern")
      }

      toast.success("Ergebnis gespeichert")

      // Reset state
      setSelected(null)
      setNote("")
      setCallbackAt("")
      setTerminAt("")

      onComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler beim Speichern"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }, [selected, note, callbackAt, terminAt, leadId, onComplete])

  const handleReset = useCallback(() => {
    setSelected(null)
    setNote("")
    setCallbackAt("")
    setTerminAt("")
  }, [])

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent closing without selection */ }}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-1">
              <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                Anrufergebnis erfassen
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                {leadName} &mdash; Wie war der Kontaktversuch?
              </DialogDescription>
            </div>

            {/* 2x3 Grid of outcome options */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {OUTCOME_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelect(option.key)}
                  disabled={submitting}
                  className={cn(
                    "flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-center transition-all",
                    option.bgClass,
                    selected === option.key
                      ? "ring-2 ring-primary ring-offset-2 border-primary"
                      : "border-transparent"
                  )}
                >
                  {option.icon}
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>

            {/* Date/Time picker for callback or appointment */}
            {selectedOption?.needsDateTime === "callback" && (
              <div className="mt-4">
                <Label htmlFor="callback-dt" className="text-sm font-medium">
                  Rückruf-Zeitpunkt
                </Label>
                <Input
                  id="callback-dt"
                  type="datetime-local"
                  value={callbackAt}
                  onChange={(e) => setCallbackAt(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {selectedOption?.needsDateTime === "appointment" && (
              <div className="mt-4">
                <Label htmlFor="termin-dt" className="text-sm font-medium">
                  Termin-Zeitpunkt
                </Label>
                <Input
                  id="termin-dt"
                  type="datetime-local"
                  value={terminAt}
                  onChange={(e) => setTerminAt(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Optional note */}
            {selected && (
              <div className="mt-4">
                <Label htmlFor="outcome-note" className="text-sm font-medium">
                  Notiz (optional)
                </Label>
                <Textarea
                  id="outcome-note"
                  placeholder="Kurze Notiz zum Ergebnis..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 min-h-[60px]"
                />
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selected) {
                    handleReset()
                  } else {
                    onClose()
                  }
                }}
                disabled={submitting}
              >
                {selected ? "Zurücksetzen" : "Abbrechen"}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="min-w-[140px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Ergebnis speichern"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  )
}
