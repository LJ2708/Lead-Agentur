"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Globe, Send, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import type { Database } from "@/types/database"

interface WebhookLogEntry {
  id: string
  lead_id: string
  title: string
  description: string | null
  created_at: string
  lead?: {
    vorname: string | null
    nachname: string | null
  } | null
}

export default function AdminWebhooksPage() {
  // Meta form state
  const [metaVorname, setMetaVorname] = useState("Max")
  const [metaNachname, setMetaNachname] = useState("Mustermann")
  const [metaEmail, setMetaEmail] = useState("test@example.com")
  const [metaTelefon, setMetaTelefon] = useState("+491701234567")
  const [metaCampaign, setMetaCampaign] = useState("test-campaign-123")
  const [metaFormId, setMetaFormId] = useState("form-456")
  const [metaSending, setMetaSending] = useState(false)
  const [metaResponse, setMetaResponse] = useState<{ ok: boolean; data: string } | null>(null)

  // Landingpage form state
  const [lpVorname, setLpVorname] = useState("Erika")
  const [lpNachname, setLpNachname] = useState("Musterfrau")
  const [lpEmail, setLpEmail] = useState("erika@example.com")
  const [lpTelefon, setLpTelefon] = useState("+491709876543")
  const [lpUtmSource, setLpUtmSource] = useState("google")
  const [lpUtmMedium, setLpUtmMedium] = useState("cpc")
  const [lpUtmCampaign, setLpUtmCampaign] = useState("test-campaign")
  const [lpUtmContent, setLpUtmContent] = useState("")
  const [lpApiKey, setLpApiKey] = useState("")
  const [lpSending, setLpSending] = useState(false)
  const [lpResponse, setLpResponse] = useState<{ ok: boolean; data: string } | null>(null)

  // Webhook log
  const [logEntries, setLogEntries] = useState<WebhookLogEntry[]>([])
  const [logLoading, setLogLoading] = useState(true)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchLog = useCallback(async () => {
    setLogLoading(true)
    const { data, error } = await supabase
      .from("lead_activities")
      .select("id, lead_id, title, description, created_at, lead:lead_id(vorname, nachname)")
      .eq("type", "system")
      .ilike("title", "%Webhook%,%Meta%,%Landingpage%")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error fetching webhook log:", error)
    } else {
      setLogEntries(
        (data ?? []).map((entry) => ({
          ...entry,
          lead: Array.isArray(entry.lead) ? entry.lead[0] ?? null : entry.lead,
        }))
      )
    }
    setLogLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLog()
  }, [fetchLog])

  async function sendMetaTest() {
    setMetaSending(true)
    setMetaResponse(null)

    try {
      // Build a simulated Meta Lead Ad payload
      const payload = {
        object: "page",
        entry: [
          {
            id: "test-page-id",
            time: Date.now(),
            changes: [
              {
                field: "leadgen",
                value: {
                  leadgen_id: `test-${Date.now()}`,
                  form_id: metaFormId,
                  campaign_id: metaCampaign,
                  field_data: [
                    { name: "first_name", values: [metaVorname] },
                    { name: "last_name", values: [metaNachname] },
                    { name: "email", values: [metaEmail] },
                    { name: "phone_number", values: [metaTelefon] },
                  ],
                },
              },
            ],
          },
        ],
      }

      const res = await fetch("/api/webhooks/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      setMetaResponse({
        ok: res.ok,
        data: `Status: ${res.status}\n${text}`,
      })

      if (res.ok) {
        toast.success("Meta Webhook Test erfolgreich gesendet")
      } else {
        toast.warning(`Meta Webhook: Status ${res.status}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler"
      setMetaResponse({ ok: false, data: msg })
      toast.error(msg)
    } finally {
      setMetaSending(false)
      fetchLog()
    }
  }

  async function sendLandingpageTest() {
    setLpSending(true)
    setLpResponse(null)

    try {
      const payload = {
        vorname: lpVorname,
        nachname: lpNachname,
        email: lpEmail,
        telefon: lpTelefon || null,
        utm_source: lpUtmSource || null,
        utm_medium: lpUtmMedium || null,
        utm_campaign: lpUtmCampaign || null,
        utm_content: lpUtmContent || null,
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (lpApiKey) {
        headers["x-api-key"] = lpApiKey
      }

      const res = await fetch("/api/webhooks/landingpage", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      setLpResponse({
        ok: res.ok,
        data: `Status: ${res.status}\n${text}`,
      })

      if (res.ok) {
        toast.success("Landingpage Webhook Test erfolgreich gesendet")
      } else {
        toast.warning(`Landingpage Webhook: Status ${res.status}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler"
      setLpResponse({ ok: false, data: msg })
      toast.error(msg)
    } finally {
      setLpSending(false)
      fetchLog()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Webhook Tester</h1>
        <p className="text-muted-foreground">
          Webhooks simulieren und testen
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Meta Lead Ad Simulator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Meta Lead Ad Simulator
            </CardTitle>
            <CardDescription>
              Simuliert einen Meta Lead Ad Webhook-Aufruf
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vorname</Label>
                <Input value={metaVorname} onChange={(e) => setMetaVorname(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Nachname</Label>
                <Input value={metaNachname} onChange={(e) => setMetaNachname(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={metaEmail} onChange={(e) => setMetaEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Telefon</Label>
                <Input value={metaTelefon} onChange={(e) => setMetaTelefon(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Campaign ID</Label>
                <Input value={metaCampaign} onChange={(e) => setMetaCampaign(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Form ID</Label>
                <Input value={metaFormId} onChange={(e) => setMetaFormId(e.target.value)} />
              </div>
            </div>

            <Button onClick={sendMetaTest} disabled={metaSending} className="w-full">
              {metaSending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Test senden
            </Button>

            {metaResponse && (
              <div
                className={`rounded-md p-3 text-sm font-mono whitespace-pre-wrap ${
                  metaResponse.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {metaResponse.data}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Landingpage Webhook Simulator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Landingpage Webhook Simulator
            </CardTitle>
            <CardDescription>
              Simuliert einen Landingpage-Formular Webhook-Aufruf
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vorname</Label>
                <Input value={lpVorname} onChange={(e) => setLpVorname(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Nachname</Label>
                <Input value={lpNachname} onChange={(e) => setLpNachname(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={lpEmail} onChange={(e) => setLpEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Telefon</Label>
                <Input value={lpTelefon} onChange={(e) => setLpTelefon(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>UTM Source</Label>
                <Input value={lpUtmSource} onChange={(e) => setLpUtmSource(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>UTM Medium</Label>
                <Input value={lpUtmMedium} onChange={(e) => setLpUtmMedium(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>UTM Campaign</Label>
                <Input value={lpUtmCampaign} onChange={(e) => setLpUtmCampaign(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>UTM Content</Label>
                <Input value={lpUtmContent} onChange={(e) => setLpUtmContent(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>API Key (x-api-key Header)</Label>
              <Input
                type="password"
                placeholder="API Secret Key eingeben..."
                value={lpApiKey}
                onChange={(e) => setLpApiKey(e.target.value)}
              />
            </div>

            <Button onClick={sendLandingpageTest} disabled={lpSending} className="w-full">
              {lpSending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Test senden
            </Button>

            {lpResponse && (
              <div
                className={`rounded-md p-3 text-sm font-mono whitespace-pre-wrap ${
                  lpResponse.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {lpResponse.data}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Webhook Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Log</CardTitle>
              <CardDescription>Letzte 20 Webhook-Aufrufe</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLog} disabled={logLoading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${logLoading ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitstempel</TableHead>
                  <TableHead>Quelle</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : logEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Keine Webhook-Eintr&auml;ge vorhanden
                    </TableCell>
                  </TableRow>
                ) : (
                  logEntries.map((entry) => {
                    const isError =
                      entry.description?.toLowerCase().includes("error") ||
                      entry.description?.toLowerCase().includes("failed") ||
                      entry.description?.toLowerCase().includes("fehler")

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {formatDate(entry.created_at)}{" "}
                          <span className="text-muted-foreground">
                            {new Date(entry.created_at).toLocaleTimeString("de-DE")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.title}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.lead
                            ? `${entry.lead.vorname ?? ""} ${entry.lead.nachname ?? ""}`.trim() || "Unbekannt"
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {isError ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs">Fehler</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Erfolgreich</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
