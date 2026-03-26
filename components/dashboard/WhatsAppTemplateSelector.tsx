"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WHATSAPP_TEMPLATES, type WhatsAppTemplateName } from "@/lib/whatsapp/templates"
import { toast } from "sonner"
import { Loader2Icon, SendIcon, MessageSquareIcon } from "lucide-react"

interface WhatsAppTemplateSelectorProps {
  leadId: string
  leadPhone: string
  leadName: string
  optInWhatsapp: boolean
  onSent?: () => void
}

const TEMPLATE_PREVIEW_TEXT: Record<WhatsAppTemplateName, string> = {
  lead_willkommen:
    "Hallo {{lead_vorname}}, vielen Dank fuer Ihr Interesse! Ihr persoenlicher Berater {{berater_name}} wird sich in Kuerze bei Ihnen melden. Sie erreichen ihn auch unter {{berater_telefon}}.",
  termin_bestaetigung:
    "Hallo {{lead_name}}, Ihr Termin am {{datum}} um {{uhrzeit}} mit {{berater_name}} ist bestaetigt. Wir freuen uns auf das Gespraech!",
  termin_erinnerung_24h:
    "Hallo {{lead_name}}, zur Erinnerung: Morgen am {{datum}} um {{uhrzeit}} findet Ihr Termin mit {{berater_name}} statt.",
  termin_erinnerung_1h:
    "Hallo {{lead_name}}, in einer Stunde ({{uhrzeit}}) beginnt Ihr Termin mit {{berater_name}}. Bis gleich!",
  no_show_nachfassung:
    "Hallo {{lead_name}}, leider haben wir Sie heute nicht erreicht. {{berater_name}} wuerde sich freuen, einen neuen Termin zu vereinbaren: {{neuer_termin_link}}",
  follow_up:
    "Hallo {{lead_name}}, hier meldet sich {{berater_name}} nochmals. {{nachricht}}",
}

const templateEntries = Object.entries(WHATSAPP_TEMPLATES) as [
  WhatsAppTemplateName,
  (typeof WHATSAPP_TEMPLATES)[WhatsAppTemplateName],
][]

export default function WhatsAppTemplateSelector({
  leadId,
  leadPhone,
  leadName,
  optInWhatsapp,
  onSent,
}: WhatsAppTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateName | "">("")
  const [isSending, setIsSending] = useState(false)

  async function handleSend() {
    if (!selectedTemplate) {
      toast.error("Bitte waehlen Sie eine Vorlage aus.")
      return
    }

    setIsSending(true)

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          phone: leadPhone,
          templateName: selectedTemplate,
          leadName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Fehler beim Senden")
      }

      toast.success("WhatsApp-Nachricht wurde gesendet.")
      setSelectedTemplate("")
      onSent?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      toast.error(`Senden fehlgeschlagen: ${message}`)
    } finally {
      setIsSending(false)
    }
  }

  if (!optInWhatsapp) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <MessageSquareIcon className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Kein WhatsApp Opt-in. Der Lead hat dem Empfang von WhatsApp-Nachrichten nicht zugestimmt.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareIcon className="size-4" />
          WhatsApp-Vorlage senden
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template-select">Vorlage auswaehlen</Label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={(e) =>
              setSelectedTemplate(e.target.value as WhatsAppTemplateName | "")
            }
            disabled={isSending}
            className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">-- Vorlage waehlen --</option>
            {templateEntries.map(([key, template]) => (
              <option key={key} value={key}>
                {template.description}
              </option>
            ))}
          </select>
        </div>

        {selectedTemplate && (
          <div className="space-y-2">
            <Label>Vorschau</Label>
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 p-3 text-sm text-muted-foreground">
              {TEMPLATE_PREVIEW_TEXT[selectedTemplate]}
            </div>
            <p className="text-xs text-muted-foreground">
              Parameter: {WHATSAPP_TEMPLATES[selectedTemplate].parameters.join(", ")}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSend}
            disabled={!selectedTemplate || isSending}
          >
            {isSending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
                Wird gesendet...
              </>
            ) : (
              <>
                <SendIcon className="size-4" data-icon="inline-start" />
                Nachricht senden
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            An: {leadPhone}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
