"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2Icon, SaveIcon, SettingsIcon } from "lucide-react"
import type { Tables } from "@/types/database"

type RoutingConfigEntry = Tables<"routing_config">

interface RoutingConfigPanelProps {
  config: RoutingConfigEntry[]
}

/**
 * Well-known routing config keys and their metadata.
 */
const CONFIG_FIELDS = [
  {
    name: "reminder_minutes",
    label: "Erinnerung nach (Minuten)",
    description:
      "Wie viele Minuten nach Zuweisung eine Erinnerung an den Berater gesendet wird.",
    unit: "min",
  },
  {
    name: "auto_reassign_minutes",
    label: "Auto-Neuzuweisung nach (Minuten)",
    description:
      "Nach wie vielen Minuten ohne Reaktion der Lead automatisch neu zugewiesen wird.",
    unit: "min",
  },
  {
    name: "admin_alert_minutes",
    label: "Admin-Benachrichtigung nach (Minuten)",
    description:
      "Nach wie vielen Minuten ohne Aktion der Admin benachrichtigt wird.",
    unit: "min",
  },
  {
    name: "max_kontaktversuche",
    label: "Max. Kontaktversuche",
    description:
      "Maximale Anzahl an Kontaktversuchen bevor ein Lead zurückgegeben wird.",
    unit: "",
  },
] as const

function getConfigValue(
  entries: RoutingConfigEntry[],
  name: string
): string {
  const entry = entries.find((e) => e.key === name)
  if (!entry) return ""
  const value = entry.value as Record<string, unknown> | null
  if (value && typeof value === "object" && "value" in value) {
    return String(value.value ?? "")
  }
  return ""
}

function getConfigEntry(
  entries: RoutingConfigEntry[],
  name: string
): RoutingConfigEntry | undefined {
  return entries.find((e) => e.key === name)
}

export default function RoutingConfigPanel({
  config,
}: RoutingConfigPanelProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of CONFIG_FIELDS) {
      initial[field.name] = getConfigValue(config, field.name)
    }
    return initial
  })
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    setIsSaving(true)

    try {
      const updates = CONFIG_FIELDS.map((field) => {
        const entry = getConfigEntry(config, field.name)
        const numericValue = parseInt(values[field.name] || "0", 10)

        return fetch(`/api/admin/routing-config${entry ? `/${entry.id}` : ""}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: field.name,
            value: { value: numericValue },
          }),
        })
      })

      const results = await Promise.all(updates)
      const failed = results.filter((r) => !r.ok)

      if (failed.length > 0) {
        toast.error(
          `${failed.length} Konfiguration(en) konnten nicht gespeichert werden.`
        )
      } else {
        toast.success("Routing-Konfiguration gespeichert.")
      }
    } catch {
      toast.error("Fehler beim Speichern der Konfiguration.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="size-4" />
          Routing-Konfiguration
        </CardTitle>
        <CardDescription>
          Zeitliche Regeln für die automatische Lead-Verteilung und
          Eskalation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {CONFIG_FIELDS.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`config-${field.name}`}>{field.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`config-${field.name}`}
                  type="number"
                  min={0}
                  value={values[field.name]}
                  onChange={(e) =>
                    handleChange(field.name, e.target.value)
                  }
                  disabled={isSaving}
                  className="max-w-[140px]"
                />
                {field.unit && (
                  <span className="text-sm text-muted-foreground">
                    {field.unit}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
              Speichern...
            </>
          ) : (
            <>
              <SaveIcon className="size-4" data-icon="inline-start" />
              Konfiguration speichern
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
