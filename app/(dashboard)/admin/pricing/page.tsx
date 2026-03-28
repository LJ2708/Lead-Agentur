"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  calcPreisProLead,
  calcGesamtpreis,
  formatPreis,
  MIN_LEADS,
  MAX_LEADS,
} from "@/lib/pricing/calculator"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Save, Settings } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PricingConfigRow {
  id: string
  key: string
  value: number
  label: string | null
  description: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CONFIG_KEYS: string[] = [
  "min_leads",
  "max_leads_self_service",
  "preis_bei_min_cents",
  "preis_bei_max_cents",
  "setter_aufpreis_cents",
  "setter_verguetung_cents",
  "mindestlaufzeit_monate",
  "max_kontaktversuche_setter",
] as const

type ConfigKey = (typeof CONFIG_KEYS)[number]

const CENT_FIELDS: ConfigKey[] = [
  "preis_bei_min_cents",
  "preis_bei_max_cents",
  "setter_aufpreis_cents",
  "setter_verguetung_cents",
]

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function buildChartData(): { leads: number; preis: number }[] {
  const data: { leads: number; preis: number }[] = []
  for (let l = MIN_LEADS; l <= MAX_LEADS; l++) {
    data.push({ leads: l, preis: calcPreisProLead(l) })
  }
  return data
}

const PREVIEW_LEADS = [10, 15, 20, 25, 30, 40, 50]

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function AdminPricingPage() {
  const [configs, setConfigs] = useState<PricingConfigRow[]>([])
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("pricing_config")
      .select("*")
      .order("key")

    if (error) {
      console.error("Pricing-Config konnte nicht geladen werden:", error)
      setLoading(false)
      return
    }

    setConfigs(data ?? [])

    const values: Record<string, string> = {}
    for (const row of data ?? []) {
      if (CENT_FIELDS.includes(row.key as ConfigKey)) {
        values[row.key] = String(row.value / 100)
      } else {
        values[row.key] = String(row.value)
      }
    }
    setEditValues(values)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)

    const supabase = createClient()

    for (const row of configs) {
      const rawValue = editValues[row.key]
      if (rawValue === undefined) continue

      let numericValue = parseFloat(rawValue)
      if (isNaN(numericValue)) continue

      if (CENT_FIELDS.includes(row.key as ConfigKey)) {
        numericValue = Math.round(numericValue * 100)
      }

      const { error } = await supabase
        .from("pricing_config")
        .update({ value: numericValue, updated_at: new Date().toISOString() })
        .eq("id", row.id)

      if (error) {
        console.error(`Fehler beim Speichern von ${row.key}:`, error)
        setSaveMessage(`Fehler beim Speichern von ${row.label ?? row.key}`)
        setSaving(false)
        return
      }
    }

    setSaveMessage("Konfiguration gespeichert!")
    setSaving(false)
    await fetchConfig()
  }

  const chartData = buildChartData()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing-Konfiguration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Degressive Preisgestaltung von {MIN_LEADS} bis {MAX_LEADS} Leads pro Monat verwalten.
        </p>
      </div>

      {/* Pricing Curve Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preiskurve</CardTitle>
          <CardDescription>
            Preis pro Lead in Abh\u00e4ngigkeit von der monatlichen Lead-Anzahl
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="leads"
                  label={{ value: "Leads / Monat", position: "insideBottomRight", offset: -5 }}
                />
                <YAxis
                  label={{ value: "\u20AC / Lead", angle: -90, position: "insideLeft" }}
                  domain={[35, 65]}
                />
                <Tooltip
                  formatter={(value) => [`${value}\u202F\u20AC`, "Preis/Lead"]}
                  labelFormatter={(label) => `${label} Leads`}
                />
                <Line
                  type="monotone"
                  dataKey="preis"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Config Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Einstellungen
          </CardTitle>
          <CardDescription>
            Werte anpassen. Cent-Felder werden in Euro angezeigt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {configs.map((row) => (
              <div key={row.id} className="space-y-1.5">
                <Label htmlFor={row.key}>
                  {row.label ?? row.key}
                  {CENT_FIELDS.includes(row.key as ConfigKey) && (
                    <span className="ml-1 text-xs text-muted-foreground">(\u20AC)</span>
                  )}
                </Label>
                <Input
                  id={row.key}
                  type="number"
                  step={CENT_FIELDS.includes(row.key as ConfigKey) ? "0.01" : "1"}
                  value={editValues[row.key] ?? ""}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, [row.key]: e.target.value }))
                  }
                />
                {row.description && (
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Speichern
            </Button>
            {saveMessage && (
              <span className="text-sm text-muted-foreground">{saveMessage}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preis\u00fcbersicht</CardTitle>
          <CardDescription>
            Berechnete Preise f\u00fcr verschiedene Lead-Mengen (ohne Setter)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leads/Monat</TableHead>
                <TableHead>Preis/Lead</TableHead>
                <TableHead>Monatspreis</TableHead>
                <TableHead>Ersparnis/Lead</TableHead>
                <TableHead>Ersparnis gesamt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PREVIEW_LEADS.map((leads) => {
                const result = calcGesamtpreis(leads, false)
                return (
                  <TableRow key={leads}>
                    <TableCell className="font-medium">{leads}</TableCell>
                    <TableCell>{formatPreis(result.preisProLead)}</TableCell>
                    <TableCell>{formatPreis(result.monatspreis)}</TableCell>
                    <TableCell>
                      {result.ersparnisProLead > 0
                        ? formatPreis(result.ersparnisProLead)
                        : "\u2014"}
                    </TableCell>
                    <TableCell>
                      {result.ersparnis > 0
                        ? formatPreis(result.ersparnis)
                        : "\u2014"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
