"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Settings,
  Play,
  Loader2,
  RefreshCw,
  Clock,
  Users,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import type { Database } from "@/types/database"

interface RoutingSettings {
  reminder_minutes: number
  auto_reassign_minutes: number
  admin_alert_minutes: number
  max_kontaktversuche: number
}

interface BeraterPacing {
  id: string
  name: string
  status: string
  kontingent: number
  verwendet: number
  prozent: number
  leadsHeute: number
  maxProTag: number
}

export default function AdminRoutingPage() {
  const [settings, setSettings] = useState<RoutingSettings>({
    reminder_minutes: 15,
    auto_reassign_minutes: 60,
    admin_alert_minutes: 30,
    max_kontaktversuche: 5,
  })
  const [beraterPacing, setBeraterPacing] = useState<BeraterPacing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [distributing, setDistributing] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Fetch routing config
      const { data: configs } = await supabase
        .from("routing_config")
        .select("*")
        .select("*")

      if (configs) {
        for (const cfg of configs) {
          const val = cfg.value as Record<string, number> | number | null
          const numVal = typeof val === 'number' ? val : (val as Record<string, unknown>)?.value as number | undefined
          if (cfg.key === 'reminder_minutes' && numVal != null) setSettings(s => ({ ...s, reminder_minutes: numVal }))
          if (cfg.key === 'auto_reassign_minutes' && numVal != null) setSettings(s => ({ ...s, auto_reassign_minutes: numVal }))
          if (cfg.key === 'admin_alert_minutes' && numVal != null) setSettings(s => ({ ...s, admin_alert_minutes: numVal }))
          if (cfg.key === 'max_kontaktversuche' && numVal != null) setSettings(s => ({ ...s, max_kontaktversuche: numVal }))
        }
      }

      // Fetch berater pacing overview
      const { data: berater } = await supabase
        .from("berater")
        .select(
          "id, status, leads_kontingent, leads_geliefert, profiles:profile_id(full_name)"
        )
        .in("status", ["aktiv", "pausiert"])

      if (berater) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayISO = today.toISOString()

        const pacingData: BeraterPacing[] = await Promise.all(
          berater.map(async (b) => {
            const profile = b.profiles as unknown as {
              full_name: string | null
            } | null

            // Count leads assigned today
            const { count } = await supabase
              .from("leads")
              .select("*", { count: "exact", head: true })
              .eq("berater_id", b.id)
              .gte("zugewiesen_am", todayISO)

            const kontingent = b.leads_kontingent ?? 0
            const verwendet = b.leads_geliefert ?? 0

            return {
              id: b.id,
              name: profile?.full_name ?? "Unbekannt",
              status: b.status,
              kontingent,
              verwendet,
              prozent: kontingent > 0 ? Math.round((verwendet / kontingent) * 100) : 0,
              leadsHeute: count ?? 0,
              maxProTag: 0,
            }
          })
        )

        setBeraterPacing(pacingData)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  async function handleSave() {
    setSaving(true)

    // Upsert routing config
    // Save each setting as a separate routing_config row
    const configEntries = [
      { key: 'reminder_minutes', value: settings.reminder_minutes },
      { key: 'auto_reassign_minutes', value: settings.auto_reassign_minutes },
      { key: 'admin_alert_minutes', value: settings.admin_alert_minutes },
      { key: 'max_kontaktversuche', value: settings.max_kontaktversuche },
    ]

    for (const entry of configEntries) {
      const { data: existing } = await supabase
        .from("routing_config")
        .select("id")
        .eq("key", entry.key)
        .limit(1)

      if (existing && existing.length > 0) {
        await supabase
          .from("routing_config")
          .update({ value: { value: entry.value } })
          .eq("id", existing[0].id)
      } else {
        await supabase.from("routing_config").insert({
          key: entry.key,
          value: { value: entry.value },
        })
      }
    }

    setSaving(false)
  }

  async function handleManualDistribution() {
    setDistributing(true)

    // Fetch leads in warteschlange
    const { data: queuedLeads } = await supabase
      .from("leads")
      .select("id")
      .eq("status", "warteschlange")
      .order("created_at", { ascending: true })
      .limit(10)

    if (queuedLeads && queuedLeads.length > 0) {
      // In production, this would call the routing engine API
      // For now, log the action
      console.log(
        `Manual distribution triggered for ${queuedLeads.length} leads in queue`
      )
    }

    setDistributing(false)
  }

  const settingsFields = [
    {
      key: "reminder_minutes" as const,
      label: "Erinnerung nach (Min.)",
      description: "Minuten bis zur Erinnerung bei unbeantworteten Leads",
      icon: Clock,
    },
    {
      key: "auto_reassign_minutes" as const,
      label: "Auto-Neuzuweisung nach (Min.)",
      description: "Minuten bis zur automatischen Neuzuweisung",
      icon: RotateCcw,
    },
    {
      key: "admin_alert_minutes" as const,
      label: "Admin-Alert nach (Min.)",
      description: "Minuten bis zur Admin-Benachrichtigung",
      icon: AlertTriangle,
    },
    {
      key: "max_kontaktversuche" as const,
      label: "Max. Kontaktversuche",
      description: "Maximale Anzahl an Kontaktversuchen pro Lead",
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Routing-Konfiguration
          </h1>
          <p className="text-muted-foreground">
            Lead-Verteilung und Eskalations-Regeln verwalten.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleManualDistribution}
          disabled={distributing}
        >
          {distributing ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-1 h-4 w-4" />
          )}
          Manuelle Verteilung starten
        </Button>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            Routing-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                {settingsFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label
                      htmlFor={`routing-${field.key}`}
                      className="flex items-center gap-2"
                    >
                      <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {field.label}
                    </Label>
                    <Input
                      id={`routing-${field.key}`}
                      type="number"
                      min={1}
                      value={settings[field.key]}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [field.key]: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <Button onClick={handleSave} disabled={saving}>
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Einstellungen speichern
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pacing Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" />
            Pacing-Uebersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Berater</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kontingent</TableHead>
                  <TableHead>Fortschritt</TableHead>
                  <TableHead>Leads heute</TableHead>
                  <TableHead>Max/Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beraterPacing.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Keine Berater gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  beraterPacing.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            b.status === "aktiv"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-yellow-100 text-yellow-700"
                          )}
                        >
                          {b.status === "aktiv" ? "Aktiv" : "Pausiert"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {b.verwendet}/{b.kontingent}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                b.prozent >= 90
                                  ? "bg-emerald-500"
                                  : b.prozent >= 50
                                    ? "bg-blue-500"
                                    : "bg-yellow-500"
                              )}
                              style={{
                                width: `${Math.min(100, b.prozent)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {b.prozent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{b.leadsHeute}</TableCell>
                      <TableCell>{b.maxProTag}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
