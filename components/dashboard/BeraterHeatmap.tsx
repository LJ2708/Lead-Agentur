"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BeraterRow {
  id: string
  name: string
}

interface CellData {
  beraterId: string
  beraterName: string
  date: string
  dateLabel: string
  count: number
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function cellColor(count: number): string {
  if (count === 0) return "#f1f5f9" // slate-100
  if (count <= 2) return "#bfdbfe" // blue-200
  if (count <= 5) return "#60a5fa" // blue-400
  return "#2563eb" // blue-600
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BeraterHeatmap() {
  const [loading, setLoading] = useState(true)
  const [berater, setBerater] = useState<BeraterRow[]>([])
  const [cells, setCells] = useState<Map<string, number>>(new Map())
  const [days, setDays] = useState<{ key: string; label: string }[]>([])
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Last 30 days
    const daysList: { key: string; label: string }[] = []
    const since = new Date()
    since.setDate(since.getDate() - 29)
    since.setHours(0, 0, 0, 0)

    for (let i = 0; i < 30; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
      daysList.push({ key, label })
    }
    setDays(daysList)

    // Fetch active berater
    const { data: beraterList } = await supabase
      .from("berater")
      .select("id, profile_id, profiles:profile_id(full_name)")
      .eq("status", "aktiv")

    const beraterRows: BeraterRow[] = (beraterList ?? []).map((b) => {
      const profile = b.profiles as unknown as { full_name: string | null } | null
      return {
        id: b.id,
        name: profile?.full_name ?? "Unbekannt",
      }
    })
    setBerater(beraterRows)

    // Fetch activities in the last 30 days
    const { data: activities } = await supabase
      .from("lead_activities")
      .select("created_by, created_at")
      .gte("created_at", since.toISOString())

    // Map profile_id -> berater_id
    const profileToBerater: Record<string, string> = {}
    for (const b of beraterList ?? []) {
      profileToBerater[b.profile_id] = b.id
    }

    // Count activities per berater per day
    const countMap = new Map<string, number>()
    for (const a of activities ?? []) {
      if (!a.created_by) continue
      const bid = profileToBerater[a.created_by]
      if (!bid) continue
      const dateKey = new Date(a.created_at).toISOString().slice(0, 10)
      const mapKey = `${bid}:${dateKey}`
      countMap.set(mapKey, (countMap.get(mapKey) ?? 0) + 1)
    }
    setCells(countMap)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleMouseEnter(
    e: React.MouseEvent,
    beraterId: string,
    beraterName: string,
    dayKey: string,
    dayLabel: string
  ) {
    const count = cells.get(`${beraterId}:${dayKey}`) ?? 0
    setHoveredCell({ beraterId, beraterName, date: dayKey, dateLabel: dayLabel, count })
    setTooltipPos({ x: e.clientX, y: e.clientY })
  }

  function handleMouseLeave() {
    setHoveredCell(null)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Berater-Aktivität</CardTitle>
          <CardDescription>Heatmap der letzten 30 Tage</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Berater-Aktivität</CardTitle>
        <CardDescription>Heatmap der letzten 30 Tage</CardDescription>
      </CardHeader>
      <CardContent>
        {berater.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine aktiven Berater vorhanden.
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Day labels row */}
              <div className="flex">
                <div className="w-28 shrink-0" />
                {days.map((d, i) => (
                  <div
                    key={d.key}
                    className="flex w-5 shrink-0 items-end justify-center"
                  >
                    {i % 5 === 0 && (
                      <span className="origin-bottom-left -rotate-45 whitespace-nowrap text-[9px] text-muted-foreground">
                        {d.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {berater.map((b) => (
                <div key={b.id} className="flex items-center">
                  <div className="w-28 shrink-0 truncate pr-2 text-right text-xs font-medium">
                    {b.name}
                  </div>
                  {days.map((d) => {
                    const count = cells.get(`${b.id}:${d.key}`) ?? 0
                    return (
                      <div
                        key={d.key}
                        className="h-4 w-5 shrink-0 cursor-pointer rounded-[2px] border border-white"
                        style={{ backgroundColor: cellColor(count) }}
                        onMouseEnter={(e) =>
                          handleMouseEnter(e, b.id, b.name, d.key, d.label)
                        }
                        onMouseLeave={handleMouseLeave}
                      />
                    )
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Weniger</span>
                {[0, 1, 3, 6].map((n) => (
                  <div
                    key={n}
                    className="h-3 w-3 rounded-[2px]"
                    style={{ backgroundColor: cellColor(n) }}
                  />
                ))}
                <span>Mehr</span>
              </div>
            </div>

            {/* Tooltip */}
            {hoveredCell && (
              <div
                className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md"
                style={{
                  left: tooltipPos.x + 12,
                  top: tooltipPos.y - 30,
                }}
              >
                <p className="font-medium">{hoveredCell.beraterName}</p>
                <p>
                  {hoveredCell.dateLabel}: {hoveredCell.count} Aktivität
                  {hoveredCell.count !== 1 ? "en" : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
