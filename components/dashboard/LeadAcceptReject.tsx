"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface LeadAcceptRejectProps {
  leadId: string
  leadName: string
  onAccept?: () => void
  onReject?: () => void
}

export function LeadAcceptReject({
  leadId,
  leadName,
  onAccept,
  onReject,
}: LeadAcceptRejectProps) {
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const handleAccept = useCallback(async () => {
    setAccepting(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/accept`, {
        method: "POST",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(
          (body as { error?: string } | null)?.error ?? "Fehler beim Akzeptieren"
        )
      }

      toast.success(`Lead "${leadName}" akzeptiert`)
      onAccept?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Fehler beim Akzeptieren"
      toast.error(message)
    } finally {
      setAccepting(false)
    }
  }, [leadId, leadName, onAccept])

  const handleReject = useCallback(async () => {
    setRejecting(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/reject`, {
        method: "POST",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(
          (body as { error?: string } | null)?.error ?? "Fehler beim Ablehnen"
        )
      }

      toast.success(`Lead "${leadName}" abgelehnt und umverteilt`)
      onReject?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Fehler beim Ablehnen"
      toast.error(message)
    } finally {
      setRejecting(false)
    }
  }, [leadId, leadName, onReject])

  const isLoading = accepting || rejecting

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={handleAccept}
        disabled={isLoading}
      >
        {accepting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        Annehmen
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={handleReject}
        disabled={isLoading}
      >
        {rejecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        Ablehnen
      </Button>
    </div>
  )
}
