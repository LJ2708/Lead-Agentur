"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Settings,
  Bell,
  Key,
  AlertTriangle,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/types/database"

interface AppSettings {
  company_name: string
  admin_email: string
  app_url: string
  notify_new_lead: boolean
  notify_sla_breach: boolean
  notify_payment_failed: boolean
  alert_email: string
}

const DEFAULT_SETTINGS: AppSettings = {
  company_name: "LeadSolution",
  admin_email: "",
  app_url: "",
  notify_new_lead: true,
  notify_sla_breach: true,
  notify_payment_failed: true,
  alert_email: "",
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingTestLeads, setDeletingTestLeads] = useState(false)
  const [resettingKontingente, setResettingKontingente] = useState(false)

  // API key status
  const [apiStatus, setApiStatus] = useState({
    supabase: false,
    stripe: false,
    resend: false,
    whatsapp: false,
    meta_webhook: false,
  })

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchSettings = useCallback(async () => {
    setLoading(true)

    // Try to load from routing_config where key starts with 'app_setting_'
    const { data } = await supabase
      .from("routing_config")
      .select("key, value")
      .ilike("key", "app_setting_%")

    const loaded: Partial<AppSettings> = {}
    if (data) {
      for (const row of data) {
        const settingKey = row.key.replace("app_setting_", "")
        const val = row.value as unknown

        if (settingKey === "company_name" && typeof val === "string") loaded.company_name = val
        else if (settingKey === "admin_email" && typeof val === "string") loaded.admin_email = val
        else if (settingKey === "app_url" && typeof val === "string") loaded.app_url = val
        else if (settingKey === "alert_email" && typeof val === "string") loaded.alert_email = val
        else if (settingKey === "notify_new_lead") loaded.notify_new_lead = val === true || val === "true"
        else if (settingKey === "notify_sla_breach") loaded.notify_sla_breach = val === true || val === "true"
        else if (settingKey === "notify_payment_failed") loaded.notify_payment_failed = val === true || val === "true"
      }
    }

    setSettings({ ...DEFAULT_SETTINGS, ...loaded })

    // Check API key status - infer from Supabase connectivity
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1)
      setApiStatus((prev) => ({ ...prev, supabase: !error }))
    } catch {
      setApiStatus((prev) => ({ ...prev, supabase: false }))
    }

    // For other services, we detect by checking if any relevant config exists
    const { data: configs } = await supabase
      .from("routing_config")
      .select("key")
      .in("key", ["stripe_configured", "resend_configured", "whatsapp_configured", "meta_webhook_configured"])

    if (configs) {
      const keys = configs.map((c) => c.key)
      setApiStatus((prev) => ({
        ...prev,
        stripe: keys.includes("stripe_configured"),
        resend: keys.includes("resend_configured"),
        whatsapp: keys.includes("whatsapp_configured"),
        meta_webhook: keys.includes("meta_webhook_configured"),
      }))
    }

    // Supabase is always configured if we got this far
    setApiStatus((prev) => ({ ...prev, supabase: true }))

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function saveSettings() {
    setSaving(true)

    try {
      const entries: Array<{ key: string; value: string | boolean }> = [
        { key: "app_setting_company_name", value: settings.company_name },
        { key: "app_setting_admin_email", value: settings.admin_email },
        { key: "app_setting_app_url", value: settings.app_url },
        { key: "app_setting_alert_email", value: settings.alert_email },
        { key: "app_setting_notify_new_lead", value: settings.notify_new_lead },
        { key: "app_setting_notify_sla_breach", value: settings.notify_sla_breach },
        { key: "app_setting_notify_payment_failed", value: settings.notify_payment_failed },
      ]

      for (const entry of entries) {
        const { error } = await supabase
          .from("routing_config")
          .upsert(
            {
              key: entry.key,
              value: entry.value as unknown as Database["public"]["Tables"]["routing_config"]["Row"]["value"],
              description: `App Setting: ${entry.key.replace("app_setting_", "")}`,
            },
            { onConflict: "key" }
          )

        if (error) {
          throw new Error(error.message)
        }
      }

      toast.success("Einstellungen gespeichert")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler beim Speichern"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function deleteTestLeads() {
    setDeletingTestLeads(true)

    try {
      const { error, count } = await supabase
        .from("leads")
        .delete({ count: "exact" })
        .in("source", ["manuell", "import"])

      if (error) throw new Error(error.message)

      toast.success(`${count ?? 0} Test-Leads gel\u00f6scht`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler beim L\u00f6schen"
      toast.error(msg)
    } finally {
      setDeletingTestLeads(false)
    }
  }

  async function resetKontingente() {
    setResettingKontingente(true)

    try {
      // Reset all berater kontingente
      const { error } = await supabase
        .from("berater")
        .update({
          leads_geliefert: 0,
          kontingent_reset_at: new Date().toISOString(),
        })
        .gte("id", "00000000-0000-0000-0000-000000000000")

      if (error) throw new Error(error.message)

      toast.success("Monatskontingente zur\u00fcckgesetzt")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler beim Zur\u00fccksetzen"
      toast.error(msg)
    } finally {
      setResettingKontingente(false)
    }
  }

  function ServiceStatus({ configured, label }: { configured: boolean; label: string }) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm">{label}</span>
        {configured ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs">Konfiguriert</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-500">
            <XCircle className="h-4 w-4" />
            <span className="text-xs">Nicht konfiguriert</span>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-muted-foreground">App-Konfiguration verwalten</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-muted-foreground">App-Konfiguration verwalten</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 1: Allgemein */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Allgemein
            </CardTitle>
            <CardDescription>Grundlegende App-Einstellungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Firmenname</Label>
              <Input
                value={settings.company_name}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, company_name: e.target.value }))
                }
                placeholder="LeadSolution"
              />
            </div>
            <div className="space-y-1">
              <Label>Admin E-Mail</Label>
              <Input
                type="email"
                value={settings.admin_email}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, admin_email: e.target.value }))
                }
                placeholder="admin@firma.de"
              />
            </div>
            <div className="space-y-1">
              <Label>App URL</Label>
              <Input
                value={settings.app_url}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, app_url: e.target.value }))
                }
                placeholder="https://app.leadsolution.de"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Benachrichtigungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Benachrichtigungen
            </CardTitle>
            <CardDescription>E-Mail-Benachrichtigungen konfigurieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">E-Mail bei neuem Lead</p>
                <p className="text-xs text-muted-foreground">
                  Benachrichtigung wenn ein neuer Lead eingeht
                </p>
              </div>
              <Switch
                checked={settings.notify_new_lead}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, notify_new_lead: checked }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">E-Mail bei SLA-Breach</p>
                <p className="text-xs text-muted-foreground">
                  Benachrichtigung bei SLA-Verletzung
                </p>
              </div>
              <Switch
                checked={settings.notify_sla_breach}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, notify_sla_breach: checked }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">E-Mail bei Zahlung fehlgeschlagen</p>
                <p className="text-xs text-muted-foreground">
                  Benachrichtigung bei fehlgeschlagener Zahlung
                </p>
              </div>
              <Switch
                checked={settings.notify_payment_failed}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, notify_payment_failed: checked }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>Alert E-Mail-Adresse</Label>
              <Input
                type="email"
                value={settings.alert_email}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, alert_email: e.target.value }))
                }
                placeholder="alerts@firma.de"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: API Keys Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys Status
            </CardTitle>
            <CardDescription>
              Status der konfigurierten Dienste
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <ServiceStatus configured={apiStatus.supabase} label="Supabase" />
            <ServiceStatus configured={apiStatus.stripe} label="Stripe" />
            <ServiceStatus configured={apiStatus.resend} label="Resend (E-Mail)" />
            <ServiceStatus configured={apiStatus.whatsapp} label="WhatsApp" />
            <ServiceStatus configured={apiStatus.meta_webhook} label="Meta Webhook" />
          </CardContent>
        </Card>

        {/* Section 4: Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Vorsicht: Diese Aktionen k&ouml;nnen nicht r&uuml;ckg&auml;ngig gemacht werden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Alle Test-Leads l&ouml;schen</p>
                <p className="text-xs text-muted-foreground">
                  L&ouml;scht Leads mit Quelle &quot;manuell&quot; oder &quot;import&quot;
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deletingTestLeads}>
                    {deletingTestLeads ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-4 w-4" />
                    )}
                    L&ouml;schen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Test-Leads l&ouml;schen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Alle Leads mit Quelle &quot;manuell&quot; oder &quot;import&quot; werden
                      unwiderruflich gel&ouml;scht. Diese Aktion kann nicht
                      r&uuml;ckg&auml;ngig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteTestLeads}>
                      Endg&uuml;ltig l&ouml;schen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Kontingente zur&uuml;cksetzen</p>
                <p className="text-xs text-muted-foreground">
                  Setzt alle Berater-Monatskontingente auf 0
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={resettingKontingente}>
                    {resettingKontingente ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 h-4 w-4" />
                    )}
                    Zur&uuml;cksetzen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kontingente zur&uuml;cksetzen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Alle Berater-Monatskontingente (leads_geliefert) werden auf 0
                      zur&uuml;ckgesetzt. Diese Aktion kann nicht r&uuml;ckg&auml;ngig
                      gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={resetKontingente}>
                      Zur&uuml;cksetzen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
