"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from "react"
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
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Plus, Save, Trash2, Loader2 } from "lucide-react"
import type { Database } from "@/types/database"
import { DEFAULT_FOLLOWUP_RULES } from "@/lib/leads/followup"
import type { FollowUpRule } from "@/lib/leads/followup"

type LeadStatus = Database["public"]["Enums"]["lead_status"]

const STATUS_OPTIONS: LeadStatus[] = [
  "neu",
  "zugewiesen",
  "kontaktversuch",
  "nicht_erreicht",
  "qualifiziert",
  "termin",
  "show",
  "no_show",
  "nachfassen",
  "abschluss",
  "verloren",
  "warteschlange",
]

const ACTION_OPTIONS: FollowUpRule["action"][] = [
  "retry",
  "email",
  "reminder",
  "auto-verloren",
]

const ACTION_LABELS: Record<FollowUpRule["action"], string> = {
  retry: "Erneut anrufen",
  email: "E-Mail senden",
  reminder: "Erinnerung",
  "auto-verloren": "Auto-Verloren",
}

function createSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function AdminAutomationPage() {
  const [rules, setRules] = useState<FollowUpRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadRules = useCallback(async () => {
    setLoading(true)
    const supabase = createSupabase()
    const { data } = await supabase
      .from("routing_config")
      .select("value")
      .eq("key", "followup_rules")
      .maybeSingle()

    if (data?.value) {
      try {
        const parsed = data.value as unknown as FollowUpRule[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRules(parsed)
        } else {
          setRules([...DEFAULT_FOLLOWUP_RULES])
        }
      } catch {
        setRules([...DEFAULT_FOLLOWUP_RULES])
      }
    } else {
      setRules([...DEFAULT_FOLLOWUP_RULES])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const saveRules = async () => {
    setSaving(true)
    const supabase = createSupabase()
    const { data: existing } = await supabase
      .from("routing_config")
      .select("id")
      .eq("key", "followup_rules")
      .maybeSingle()

    if (existing) {
      await supabase
        .from("routing_config")
        .update({ value: rules as any })
        .eq("key", "followup_rules")
    } else {
      await supabase.from("routing_config").insert({
        key: "followup_rules",
        value: rules as any,
        description: "Follow-Up Automatisierungsregeln",
      })
    }
    setSaving(false)
  }

  const addRule = () => {
    const newRule: FollowUpRule = {
      id: `rule_${Date.now()}`,
      name: "Neue Regel",
      trigger_status: "nicht_erreicht",
      delay_hours: 1,
      action: "reminder",
      active: true,
    }
    setRules([...rules, newRule])
  }

  const updateRule = (index: number, updates: Partial<FollowUpRule>) => {
    const updated = [...rules]
    updated[index] = { ...updated[index], ...updates }
    setRules(updated)
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automatisierung</h1>
          <p className="text-muted-foreground">
            Follow-Up Regeln f&uuml;r automatische Lead-Bearbeitung
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Regel
          </Button>
          <Button size="sm" onClick={saveRules} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Follow-Up Regeln
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger-Status</TableHead>
                <TableHead>Verz&ouml;gerung (Std.)</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Aktiv</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, index) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Input
                      value={rule.name}
                      onChange={(e) =>
                        updateRule(index, { name: e.target.value })
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rule.trigger_status}
                      onValueChange={(v) =>
                        updateRule(index, {
                          trigger_status: v as LeadStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.delay_hours}
                      onChange={(e) =>
                        updateRule(index, {
                          delay_hours: Number(e.target.value),
                        })
                      }
                      className="h-8 w-20"
                      min={0}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rule.action}
                      onValueChange={(v) =>
                        updateRule(index, {
                          action: v as FollowUpRule["action"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {ACTION_LABELS[a]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(checked) =>
                        updateRule(index, { active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(index)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Keine Regeln vorhanden. Klicken Sie auf &quot;Neue Regel&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
