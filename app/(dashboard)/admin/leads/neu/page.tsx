"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { checkDuplicate, type DuplicateResult } from "@/lib/leads/dedup"
import { DuplicateWarning } from "@/components/dashboard/DuplicateWarning"

interface LeadFormData {
  vorname: string
  nachname: string
  email: string
  telefon: string
  source: "manuell" | "import"
  opt_in_email: boolean
  opt_in_whatsapp: boolean
  opt_in_telefon: boolean
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  notizen: string
  sofort_verteilen: boolean
}

export default function AdminLeadNeuPage() {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [utmOpen, setUtmOpen] = useState(false)
  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null)
  const dedupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [form, setForm] = useState<LeadFormData>({
    vorname: "",
    nachname: "",
    email: "",
    telefon: "",
    source: "manuell",
    opt_in_email: false,
    opt_in_whatsapp: false,
    opt_in_telefon: false,
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    notizen: "",
    sofort_verteilen: false,
  })

  const runDedupCheck = useCallback(
    (updated: LeadFormData) => {
      if (dedupTimerRef.current) clearTimeout(dedupTimerRef.current)
      dedupTimerRef.current = setTimeout(async () => {
        const email = updated.email.trim()
        const telefon = updated.telefon.trim()
        if (!email && !telefon) {
          setDuplicateResult(null)
          return
        }
        const result = await checkDuplicate({
          email: email || undefined,
          telefon: telefon || undefined,
          vorname: updated.vorname.trim() || undefined,
          nachname: updated.nachname.trim() || undefined,
        })
        setDuplicateResult(result.isDuplicate ? result : null)
      }, 500)
    },
    []
  )

  function updateField<K extends keyof LeadFormData>(
    key: K,
    value: LeadFormData[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "email" || key === "telefon") {
        runDedupCheck(next)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.vorname.trim() && !form.nachname.trim()) {
      toast.error("Bitte mindestens Vorname oder Nachname angeben.")
      return
    }

    setSaving(true)

    try {
      const customFields: Record<string, string> = {}
      if (form.notizen.trim()) {
        customFields.notizen = form.notizen.trim()
      }

      const { data: lead, error } = await supabase
        .from("leads")
        .insert({
          vorname: form.vorname.trim() || null,
          nachname: form.nachname.trim() || null,
          email: form.email.trim() || null,
          telefon: form.telefon.trim() || null,
          source: form.source,
          status: "neu",
          opt_in_email: form.opt_in_email,
          opt_in_whatsapp: form.opt_in_whatsapp,
          opt_in_telefon: form.opt_in_telefon,
          utm_source: form.utm_source.trim() || null,
          utm_medium: form.utm_medium.trim() || null,
          utm_campaign: form.utm_campaign.trim() || null,
          utm_content: form.utm_content.trim() || null,
          custom_fields:
            Object.keys(customFields).length > 0 ? customFields : null,
        })
        .select("id")
        .single()

      if (error) throw error

      // Optionally trigger routing
      if (form.sofort_verteilen && lead?.id) {
        try {
          const res = await fetch("/api/routing/distribute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lead_id: lead.id }),
          })
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            console.error("Routing error:", errData)
            toast.error(
              "Lead erstellt, aber Verteilung fehlgeschlagen. Lead kann manuell verteilt werden."
            )
          } else {
            toast.success("Lead erstellt und verteilt!")
          }
        } catch (routingErr) {
          console.error("Routing request failed:", routingErr)
          toast.error(
            "Lead erstellt, aber Verteilung fehlgeschlagen."
          )
        }
      } else {
        toast.success("Lead erfolgreich erstellt!")
      }

      router.push("/admin/leads")
    } catch (err) {
      console.error("Error creating lead:", err)
      toast.error("Fehler beim Erstellen des Leads.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/leads">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neuer Lead</h1>
          <p className="text-muted-foreground">
            Lead manuell erfassen und optional sofort verteilen.
          </p>
        </div>
      </div>

      {duplicateResult && duplicateResult.isDuplicate && (
        <DuplicateWarning
          duplicate={duplicateResult}
          onIgnore={() => setDuplicateResult(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: Main fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontaktdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vorname">Vorname</Label>
                  <Input
                    id="vorname"
                    value={form.vorname}
                    onChange={(e) => updateField("vorname", e.target.value)}
                    placeholder="Max"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname">Nachname</Label>
                  <Input
                    id="nachname"
                    value={form.nachname}
                    onChange={(e) => updateField("nachname", e.target.value)}
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="max@beispiel.de"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  type="tel"
                  value={form.telefon}
                  onChange={(e) => updateField("telefon", e.target.value)}
                  placeholder="+49 170 1234567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quelle">Quelle</Label>
                <Select
                  value={form.source}
                  onValueChange={(val) =>
                    updateField("source", val as "manuell" | "import")
                  }
                >
                  <SelectTrigger id="quelle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manuell">Manuell</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Right column: Options */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Opt-in Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.opt_in_email}
                    onChange={(e) =>
                      updateField("opt_in_email", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Opt-in E-Mail</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.opt_in_whatsapp}
                    onChange={(e) =>
                      updateField("opt_in_whatsapp", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Opt-in WhatsApp</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.opt_in_telefon}
                    onChange={(e) =>
                      updateField("opt_in_telefon", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Opt-in Telefon</span>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.notizen}
                  onChange={(e) => updateField("notizen", e.target.value)}
                  placeholder="Zusatzinformationen zum Lead..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* UTM Fields - Collapsible */}
            <Card>
              <CardHeader className="pb-0">
                <button
                  type="button"
                  onClick={() => setUtmOpen(!utmOpen)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <CardTitle className="text-base">UTM-Parameter</CardTitle>
                  {utmOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              {utmOpen && (
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="utm_source">UTM Source</Label>
                      <Input
                        id="utm_source"
                        value={form.utm_source}
                        onChange={(e) =>
                          updateField("utm_source", e.target.value)
                        }
                        placeholder="z.B. facebook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="utm_medium">UTM Medium</Label>
                      <Input
                        id="utm_medium"
                        value={form.utm_medium}
                        onChange={(e) =>
                          updateField("utm_medium", e.target.value)
                        }
                        placeholder="z.B. cpc"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="utm_campaign">UTM Campaign</Label>
                      <Input
                        id="utm_campaign"
                        value={form.utm_campaign}
                        onChange={(e) =>
                          updateField("utm_campaign", e.target.value)
                        }
                        placeholder="z.B. sommer_aktion"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="utm_content">UTM Content</Label>
                      <Input
                        id="utm_content"
                        value={form.utm_content}
                        onChange={(e) =>
                          updateField("utm_content", e.target.value)
                        }
                        placeholder="z.B. banner_v2"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Submit section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sofort_verteilen}
                  onChange={(e) =>
                    updateField("sofort_verteilen", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">
                  Lead sofort verteilen
                </span>
              </label>
              <div className="flex items-center gap-3">
                <Link href="/admin/leads">
                  <Button type="button" variant="outline">
                    Abbrechen
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Lead erstellen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
