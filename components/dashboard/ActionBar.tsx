"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Loader2,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ActionBarProps {
  lead: {
    id: string
    telefon: string | null
    email: string | null
    vorname: string | null
    nachname: string | null
    opt_in_whatsapp: boolean | null
  }
  onCallComplete: () => void
  onActionComplete?: () => void
}

export function ActionBar({ lead, onCallComplete, onActionComplete }: ActionBarProps) {
  const [callInitiated, setCallInitiated] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  const hasPhone = Boolean(lead.telefon)
  const hasEmail = Boolean(lead.email)
  const showWhatsApp = Boolean(lead.opt_in_whatsapp && lead.telefon)

  const logClientActivity = useCallback(
    async (
      type: "anruf" | "email" | "whatsapp" | "notiz",
      title: string,
      description?: string
    ) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        type,
        title,
        description: description ?? null,
        created_by: user?.id ?? null,
      })
    },
    [lead.id]
  )

  const handleCallClick = useCallback(async () => {
    if (!lead.telefon) return
    await logClientActivity("anruf", "Anruf gestartet")
    setCallInitiated(true)
  }, [lead.telefon, logClientActivity])

  const handleCallOutcome = useCallback(() => {
    setCallInitiated(false)
    onCallComplete()
  }, [onCallComplete])

  const handleEmailClick = useCallback(async () => {
    if (!lead.email) return
    await logClientActivity("email", "E-Mail geöffnet")
    onActionComplete?.()
  }, [lead.email, logClientActivity, onActionComplete])

  const handleWhatsAppClick = useCallback(async () => {
    if (!lead.telefon) return
    await logClientActivity("whatsapp", "WhatsApp geöffnet")
    onActionComplete?.()
  }, [lead.telefon, logClientActivity, onActionComplete])

  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      await logClientActivity("notiz", "Notiz hinzugefügt", noteText.trim())
      toast.success("Notiz gespeichert")
      setNoteText("")
      setShowNote(false)
      onActionComplete?.()
    } catch {
      toast.error("Fehler beim Speichern der Notiz")
    } finally {
      setSavingNote(false)
    }
  }, [noteText, logClientActivity, onActionComplete])

  const phoneClean = lead.telefon?.replace(/[^0-9+]/g, "") ?? ""

  return (
    <div>
      <div className="flex items-center gap-2">
        {/* Anrufen */}
        {!callInitiated ? (
          <Button
            variant="default"
            size="sm"
            className={cn(
              "min-h-[44px] flex-1 gap-1.5 bg-blue-600 text-white hover:bg-blue-700",
              !hasPhone && "opacity-50 cursor-not-allowed"
            )}
            disabled={!hasPhone}
            asChild={hasPhone}
          >
            {hasPhone ? (
              <a href={`tel:${phoneClean}`} onClick={handleCallClick}>
                <Phone className="h-4 w-4" />
                Anrufen
              </a>
            ) : (
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                Anrufen
              </span>
            )}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="min-h-[44px] flex-1 gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
            onClick={handleCallOutcome}
          >
            <Phone className="h-4 w-4" />
            Ergebnis eingeben
          </Button>
        )}

        {/* Email */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "min-h-[44px] flex-1 gap-1.5",
            !hasEmail && "opacity-50 cursor-not-allowed"
          )}
          disabled={!hasEmail}
          asChild={hasEmail}
        >
          {hasEmail ? (
            <a href={`mailto:${lead.email}`} onClick={handleEmailClick}>
              <Mail className="h-4 w-4" />
              Email
            </a>
          ) : (
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              Email
            </span>
          )}
        </Button>

        {/* WhatsApp */}
        {showWhatsApp && (
          <Button
            variant="default"
            size="sm"
            className="min-h-[44px] flex-1 gap-1.5 bg-green-600 text-white hover:bg-green-700"
            asChild
          >
            <a
              href={`https://wa.me/${phoneClean}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        )}

        {/* Notiz */}
        <Button
          variant={showNote ? "default" : "outline"}
          size="sm"
          className="min-h-[44px] flex-1 gap-1.5"
          onClick={() => setShowNote(!showNote)}
        >
          <FileText className="h-4 w-4" />
          Notiz
        </Button>
      </div>

      {/* Inline note input */}
      {showNote && (
        <div className="mt-2 flex gap-2">
          <Textarea
            placeholder="Notiz eingeben..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-h-[60px] flex-1 text-sm"
          />
          <Button
            size="sm"
            className="min-h-[44px] self-end"
            disabled={!noteText.trim() || savingNote}
            onClick={handleSaveNote}
          >
            {savingNote ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
