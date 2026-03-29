"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Settings2, TrendingUp, TrendingDown, Minus } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalData {
  label: string
  target: number
  progress: number
  unit: string
}

interface CustomTargets {
  kontaktiert?: number
  termine?: number
  abschluesse?: number
  sla?: number
}

// ---------------------------------------------------------------------------
// Circular Progress Ring
// ---------------------------------------------------------------------------

function ProgressRing({
  progress,
  target,
  size = 56,
  strokeWidth = 5,
  color,
}: {
  progress: number
  target: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = target > 0 ? Math.min(progress / target, 1) : 0
  const offset = circumference - pct * circumference

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalTracker({ beraterId }: { beraterId: string }) {
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<GoalData[]>([])
  const [customTargets, setCustomTargets] = useState<CustomTargets>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draftTargets, setDraftTargets] = useState<CustomTargets>({})

  const supabase = useMemo(() => createClient(), [])

  // Load custom targets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`goal-targets-${beraterId}`)
      if (stored) {
        const parsed = JSON.parse(stored) as CustomTargets
        setCustomTargets(parsed)
        setDraftTargets(parsed)
      }
    } catch {
      // ignore parse errors
    }
  }, [beraterId])

  const fetchGoals = useCallback(async () => {
    setLoading(true)

    // Get berater kontingent
    const { data: berater } = await supabase
      .from("berater")
      .select("leads_kontingent")
      .eq("id", beraterId)
      .single()

    const kontingent = berater?.leads_kontingent ?? 30

    // Current month range
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    // Leads kontaktiert: leads with at least 1 activity of contact type
    const { data: leads } = await supabase
      .from("leads")
      .select("id, status, sla_status, erster_kontakt_am")
      .eq("berater_id", beraterId)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd)

    const allLeads = leads ?? []
    const kontaktiert = allLeads.filter((l) => l.erster_kontakt_am !== null).length

    // Termine this month
    const { count: termineCount } = await supabase
      .from("termine")
      .select("id", { count: "exact", head: true })
      .eq("berater_id", beraterId)
      .gte("datum", monthStart)
      .lte("datum", monthEnd)

    // Abschluesse this month
    const abschluesse = allLeads.filter((l) => l.status === "abschluss").length

    // SLA rate
    const leadsWithSla = allLeads.filter((l) => l.sla_status !== null)
    const slaOk = leadsWithSla.filter((l) => l.sla_status !== "breached").length
    const slaRate = leadsWithSla.length > 0 ? Math.round((slaOk / leadsWithSla.length) * 100) : 100

    // Build goals with custom or default targets
    const targetKontaktiert = customTargets.kontaktiert ?? kontingent
    const targetTermine = customTargets.termine ?? Math.round(kontingent * 0.3)
    const targetAbschluesse = customTargets.abschluesse ?? Math.round(kontingent * 0.1)
    const targetSla = customTargets.sla ?? 95

    setGoals([
      {
        label: "Leads kontaktiert",
        target: targetKontaktiert,
        progress: kontaktiert,
        unit: "",
      },
      {
        label: "Termine gebucht",
        target: targetTermine,
        progress: termineCount ?? 0,
        unit: "",
      },
      {
        label: "Abschlüsse",
        target: targetAbschluesse,
        progress: abschluesse,
        unit: "",
      },
      {
        label: "SLA eingehalten",
        target: targetSla,
        progress: slaRate,
        unit: "%",
      },
    ])

    setLoading(false)
  }, [beraterId, supabase, customTargets])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  function getColor(progress: number, target: number): string {
    if (target === 0) return "#22c55e"
    const pct = progress / target
    if (pct >= 0.8) return "#22c55e" // green
    if (pct >= 0.5) return "#f59e0b" // amber
    return "#ef4444" // red
  }

  function getTrend(progress: number, target: number) {
    if (target === 0) return "neutral" as const
    const pct = progress / target
    if (pct >= 0.8) return "up" as const
    if (pct >= 0.5) return "neutral" as const
    return "down" as const
  }

  function saveCustomTargets() {
    setCustomTargets(draftTargets)
    try {
      localStorage.setItem(`goal-targets-${beraterId}`, JSON.stringify(draftTargets))
    } catch {
      // ignore storage errors
    }
    setDialogOpen(false)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monatsziele</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Monatsziele</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              Ziel anpassen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Monatsziele anpassen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="target-kontaktiert">Leads kontaktiert</Label>
                <Input
                  id="target-kontaktiert"
                  type="number"
                  min={0}
                  value={draftTargets.kontaktiert ?? ""}
                  placeholder="Standard: Kontingent"
                  onChange={(e) =>
                    setDraftTargets((prev) => ({
                      ...prev,
                      kontaktiert: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target-termine">Termine gebucht</Label>
                <Input
                  id="target-termine"
                  type="number"
                  min={0}
                  value={draftTargets.termine ?? ""}
                  placeholder="Standard: 30% des Kontingents"
                  onChange={(e) =>
                    setDraftTargets((prev) => ({
                      ...prev,
                      termine: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target-abschluesse">Abschlüsse</Label>
                <Input
                  id="target-abschluesse"
                  type="number"
                  min={0}
                  value={draftTargets.abschluesse ?? ""}
                  placeholder="Standard: 10% des Kontingents"
                  onChange={(e) =>
                    setDraftTargets((prev) => ({
                      ...prev,
                      abschluesse: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target-sla">SLA-Quote (%)</Label>
                <Input
                  id="target-sla"
                  type="number"
                  min={0}
                  max={100}
                  value={draftTargets.sla ?? ""}
                  placeholder="Standard: 95"
                  onChange={(e) =>
                    setDraftTargets((prev) => ({
                      ...prev,
                      sla: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <Button onClick={saveCustomTargets}>Speichern</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {goals.map((goal) => {
            const color = getColor(goal.progress, goal.target)
            const trend = getTrend(goal.progress, goal.target)

            return (
              <div
                key={goal.label}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <ProgressRing
                  progress={goal.progress}
                  target={goal.target}
                  color={color}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {goal.label}
                  </p>
                  <p className="text-sm font-bold">
                    {goal.progress}
                    {goal.unit}/{goal.target}
                    {goal.unit}
                  </p>
                  <div className="flex items-center gap-0.5">
                    {trend === "up" && (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    )}
                    {trend === "neutral" && (
                      <Minus className="h-3 w-3 text-amber-500" />
                    )}
                    {trend === "down" && (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className="text-[10px]"
                      style={{ color }}
                    >
                      {goal.target > 0
                        ? `${Math.round((goal.progress / goal.target) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
