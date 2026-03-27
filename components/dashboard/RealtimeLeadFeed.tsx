"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface FeedEvent {
  id: string
  timestamp: Date
  name: string
  type: "insert" | "update"
  status?: string
}

const statusLabels: Record<string, string> = {
  neu: "Neu",
  zugewiesen: "Zugewiesen",
  kontaktversuch: "Kontaktversuch",
  nicht_erreicht: "Nicht erreicht",
  qualifiziert: "Qualifiziert",
  termin: "Termin",
  show: "Show",
  no_show: "No-Show",
  nachfassen: "Nachfassen",
  abschluss: "Abschluss",
  verloren: "Verloren",
  warteschlange: "Warteschlange",
}

const statusDotColor: Record<string, string> = {
  neu: "bg-blue-500",
  zugewiesen: "bg-indigo-500",
  kontaktversuch: "bg-yellow-500",
  nicht_erreicht: "bg-orange-500",
  qualifiziert: "bg-emerald-500",
  termin: "bg-purple-500",
  show: "bg-green-500",
  no_show: "bg-red-500",
  nachfassen: "bg-amber-500",
  abschluss: "bg-green-600",
  verloren: "bg-gray-500",
  warteschlange: "bg-gray-400",
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const MAX_EVENTS = 5

export function RealtimeLeadFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [connected, setConnected] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    // Load recent leads on mount
    async function loadRecent() {
      const { data } = await supabase
        .from("leads")
        .select("id, vorname, nachname, status, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(MAX_EVENTS)

      if (data) {
        const initial: FeedEvent[] = data.map((lead) => ({
          id: `initial-${lead.id}`,
          timestamp: new Date(lead.updated_at ?? lead.created_at),
          name: [lead.vorname, lead.nachname].filter(Boolean).join(" ") || "Unbekannt",
          type: "update" as const,
          status: lead.status,
        }))
        setEvents(initial.reverse())
      }
    }

    loadRecent()

    const channel = supabase
      .channel("realtime-lead-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const record = payload.new as Record<string, unknown>
          const vorname = (record.vorname as string) ?? ""
          const nachname = (record.nachname as string) ?? ""
          const name = [vorname, nachname].filter(Boolean).join(" ") || "Unbekannt"

          setEvents((prev) => {
            const next = [
              ...prev,
              {
                id: `insert-${record.id as string}-${Date.now()}`,
                timestamp: new Date(),
                name,
                type: "insert" as const,
                status: (record.status as string) ?? "neu",
              },
            ]
            return next.slice(-MAX_EVENTS)
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const record = payload.new as Record<string, unknown>
          const vorname = (record.vorname as string) ?? ""
          const nachname = (record.nachname as string) ?? ""
          const name = [vorname, nachname].filter(Boolean).join(" ") || "Unbekannt"

          setEvents((prev) => {
            const next = [
              ...prev,
              {
                id: `update-${record.id as string}-${Date.now()}`,
                timestamp: new Date(),
                name,
                type: "update" as const,
                status: (record.status as string) ?? undefined,
              },
            ]
            return next.slice(-MAX_EVENTS)
          })
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Auto-scroll to newest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Activity className="h-5 w-5 text-blue-500" />
        <CardTitle className="flex items-center gap-2">
          Live Feed
          {connected && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="max-h-64 space-y-2 overflow-y-auto">
          {events.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Warte auf Lead-Aktivitäten...
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex animate-in fade-in slide-in-from-bottom-1 items-start gap-3 rounded-lg border p-2.5 text-sm duration-300"
              >
                <span
                  className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                    statusDotColor[event.status ?? "neu"] ?? "bg-gray-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">
                    {event.type === "insert" ? (
                      <>Neuer Lead: {event.name}</>
                    ) : (
                      <>
                        {event.name}
                        {event.status && (
                          <span className="text-muted-foreground">
                            {" "}&rarr; {statusLabels[event.status] ?? event.status}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(event.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
