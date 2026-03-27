"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkingHourRow {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface WorkingHoursEditorProps {
  beraterId: string
  initialHours?: WorkingHourRow[]
  onSave?: (hours: WorkingHourRow[]) => void
}

const DAY_LABELS: { day: number; label: string; short: string }[] = [
  { day: 1, label: "Montag", short: "Mo" },
  { day: 2, label: "Dienstag", short: "Di" },
  { day: 3, label: "Mittwoch", short: "Mi" },
  { day: 4, label: "Donnerstag", short: "Do" },
  { day: 5, label: "Freitag", short: "Fr" },
  { day: 6, label: "Samstag", short: "Sa" },
  { day: 0, label: "Sonntag", short: "So" },
]

const DEFAULT_HOURS: WorkingHourRow[] = DAY_LABELS.map(({ day }) => ({
  day_of_week: day,
  start_time: "09:00",
  end_time: "18:00",
  is_active: day >= 1 && day <= 5, // Mo-Fr active
}))

export function WorkingHoursEditor({
  beraterId,
  initialHours,
  onSave,
}: WorkingHoursEditorProps) {
  const [hours, setHours] = useState<WorkingHourRow[]>(
    initialHours ?? DEFAULT_HOURS
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialHours)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHours = useCallback(async () => {
    if (initialHours) return

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from("working_hours")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("berater_id", beraterId)

    if (fetchError) {
      console.error("Failed to load working hours:", fetchError)
      setIsLoading(false)
      return
    }

    if (data && data.length > 0) {
      // Merge loaded data with defaults for any missing days
      const loadedMap = new Map<number, WorkingHourRow>()
      for (const row of data) {
        loadedMap.set(row.day_of_week, {
          day_of_week: row.day_of_week,
          start_time: row.start_time.substring(0, 5), // trim seconds
          end_time: row.end_time.substring(0, 5),
          is_active: row.is_active,
        })
      }

      const merged = DAY_LABELS.map(({ day }) => {
        const loaded = loadedMap.get(day)
        if (loaded) return loaded
        return {
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          is_active: false,
        }
      })
      setHours(merged)
    }
    setIsLoading(false)
  }, [beraterId, initialHours])

  useEffect(() => {
    loadHours()
  }, [loadHours])

  function updateDay(dayOfWeek: number, field: keyof WorkingHourRow, value: string | boolean) {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    )
    setSaveSuccess(false)
  }

  function validateHours(): string | null {
    for (const h of hours) {
      if (!h.is_active) continue
      if (!h.start_time || !h.end_time) {
        const label = DAY_LABELS.find((d) => d.day === h.day_of_week)?.label ?? ""
        return `${label}: Start- und Endzeit erforderlich`
      }
      if (h.start_time >= h.end_time) {
        const label = DAY_LABELS.find((d) => d.day === h.day_of_week)?.label ?? ""
        return `${label}: Endzeit muss nach Startzeit liegen`
      }
    }
    return null
  }

  async function handleSave() {
    const validationError = validateHours()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    const supabase = createClient()

    // Delete existing entries for this berater, then insert fresh
    await supabase
      .from("working_hours")
      .delete()
      .eq("berater_id", beraterId)

    const rows = hours.map((h) => ({
      berater_id: beraterId,
      day_of_week: h.day_of_week,
      start_time: h.start_time,
      end_time: h.end_time,
      is_active: h.is_active,
    }))

    const { error: insertError } = await supabase
      .from("working_hours")
      .insert(rows)

    if (insertError) {
      console.error("Failed to save working hours:", insertError)
      setError("Arbeitszeiten konnten nicht gespeichert werden.")
    } else {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      onSave?.(hours)
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasActiveDays = hours.some((h) => h.is_active)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Arbeitszeiten</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAY_LABELS.map(({ day, label, short }) => {
          const row = hours.find((h) => h.day_of_week === day)
          if (!row) return null

          return (
            <div
              key={day}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                row.is_active
                  ? "border-blue-200 bg-blue-50/50"
                  : "border-gray-100 bg-gray-50/50"
              )}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => updateDay(day, "is_active", !row.is_active)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  row.is_active ? "bg-[#2563EB]" : "bg-gray-200"
                )}
                role="switch"
                aria-checked={row.is_active}
                aria-label={`${label} aktivieren`}
              >
                <span
                  className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    row.is_active ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>

              {/* Day label */}
              <span
                className={cn(
                  "w-12 text-sm font-medium",
                  row.is_active ? "text-gray-900" : "text-gray-400"
                )}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </span>

              {/* Time inputs */}
              {row.is_active ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => updateDay(day, "start_time", e.target.value)}
                    className="w-28 text-center"
                  />
                  <span className="text-sm text-muted-foreground">bis</span>
                  <Input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => updateDay(day, "end_time", e.target.value)}
                    className="w-28 text-center"
                  />
                </div>
              ) : (
                <span className="flex-1 text-sm text-gray-400">Frei</span>
              )}
            </div>
          )
        })}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            Arbeitszeiten erfolgreich gespeichert
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {!hasActiveDays && (
            <p className="text-sm text-amber-600">
              Mindestens ein aktiver Tag erforderlich
            </p>
          )}
          <div className="ml-auto">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Speichern
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
