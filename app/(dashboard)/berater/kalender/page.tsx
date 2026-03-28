"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Termin {
  id: string
  lead_id: string
  datum: string
  dauer_minuten: number
  status: string
  notizen: string | null
  lead_name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 08:00 - 20:00

const STATUS_COLORS: Record<string, string> = {
  geplant: "bg-blue-200 border-blue-400 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200",
  bestätigt: "bg-green-200 border-green-400 text-green-900 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200",
  abgesagt: "bg-red-200 border-red-400 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200",
  abgeschlossen: "bg-gray-200 border-gray-400 text-gray-900 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-200",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BeraterKalenderPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = useMemo(() => new Date(), [])

  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))
  const [termine, setTermine] = useState<Termin[]>([])
  const [beraterId, setBeraterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Determine berater id
  useEffect(() => {
    async function loadBeraterId() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: berater } = await supabase
        .from("berater")
        .select("id")
        .eq("profile_id", user.id)
        .single()
      if (berater) setBeraterId(berater.id)
    }
    loadBeraterId()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  const fetchTermine = useCallback(async () => {
    if (!beraterId) return
    setLoading(true)

    const { data } = await supabase
      .from("termine")
      .select("id, lead_id, datum, dauer_minuten, status, notizen, lead:lead_id(vorname, nachname)")
      .eq("berater_id", beraterId)
      .gte("datum", weekStart.toISOString())
      .lt("datum", weekEnd.toISOString())
      .order("datum", { ascending: true })

    type TerminRow = {
      id: string
      lead_id: string
      datum: string
      dauer_minuten: number
      status: string
      notizen: string | null
      lead: { vorname: string | null; nachname: string | null } | null
    }

    const mapped: Termin[] = ((data ?? []) as unknown as TerminRow[]).map((t) => ({
      id: t.id,
      lead_id: t.lead_id,
      datum: t.datum,
      dauer_minuten: t.dauer_minuten,
      status: t.status,
      notizen: t.notizen,
      lead_name: [t.lead?.vorname, t.lead?.nachname].filter(Boolean).join(" ") || "Unbenannt",
    }))

    setTermine(mapped)
    setLoading(false)
  }, [supabase, beraterId, weekStart, weekEnd])

  useEffect(() => {
    fetchTermine()
  }, [fetchTermine])

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  function formatWeekLabel() {
    const end = addDays(weekStart, 6)
    const f = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" })
    return `${f.format(weekStart)} - ${f.format(end)}`
  }

  function getTermineForDayHour(day: Date, hour: number) {
    return termine.filter((t) => {
      const d = new Date(t.datum)
      return isSameDay(d, day) && d.getHours() === hour
    })
  }

  // Upcoming termine (next 7 from now)
  const upcomingTermine = useMemo(() => {
    const now = new Date()
    return termine
      .filter((t) => new Date(t.datum) >= now)
      .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
      .slice(0, 7)
  }, [termine])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
          <p className="text-muted-foreground">
            Wochenansicht deiner Termine.
          </p>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {formatWeekLabel()}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(getWeekStart(today))}
        >
          Heute
        </Button>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Laden...
            </div>
          ) : (
            <div className="min-w-[700px]">
              {/* Header row: day labels */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                <div className="border-r p-2" />
                {days.map((day, i) => {
                  const isToday = isSameDay(day, today)
                  return (
                    <div
                      key={i}
                      className={cn(
                        "border-r p-2 text-center text-sm font-medium last:border-r-0",
                        isToday && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                    >
                      <div className="text-muted-foreground">{DAY_LABELS[i]}</div>
                      <div
                        className={cn(
                          "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                          isToday && "bg-blue-600 font-bold text-white"
                        )}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Hour rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0">
                  <div className="flex items-start justify-end border-r px-2 py-1 text-xs text-muted-foreground">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {days.map((day, di) => {
                    const isToday = isSameDay(day, today)
                    const hourTermine = getTermineForDayHour(day, hour)
                    return (
                      <div
                        key={di}
                        className={cn(
                          "min-h-[48px] border-r p-0.5 last:border-r-0",
                          isToday && "bg-blue-50/50 dark:bg-blue-900/10"
                        )}
                      >
                        {hourTermine.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => router.push(`/berater/leads/${t.lead_id}`)}
                            className={cn(
                              "mb-0.5 w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80",
                              STATUS_COLORS[t.status] ?? "bg-gray-100 border-gray-300 text-gray-800"
                            )}
                            title={`${t.lead_name} (${t.dauer_minuten} Min.)`}
                          >
                            <span className="font-medium">{t.lead_name}</span>
                            <span className="ml-1 opacity-70">{t.dauer_minuten}m</span>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming termine list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Nächste Termine
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingTermine.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine anstehenden Termine diese Woche.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingTermine.map((t) => {
                const d = new Date(t.datum)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => router.push(`/berater/leads/${t.lead_id}`)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-col items-center justify-center rounded bg-muted px-2 py-1 text-xs">
                      <span className="font-bold">
                        {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(d)}
                      </span>
                      <span className="text-muted-foreground">
                        {new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(d)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.lead_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.dauer_minuten} Minuten &middot; {t.status}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
