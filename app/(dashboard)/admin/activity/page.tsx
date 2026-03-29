"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Activity,
  Phone,
  Mail,
  MessageCircle,
  StickyNote,
  ArrowRightLeft,
  RotateCcw,
  CalendarCheck,
  CalendarX,
  ShoppingCart,
  Settings,
  GitBranch,
  Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityEntry {
  id: string
  lead_id: string
  type: string
  title: string
  description: string | null
  created_by: string | null
  created_at: string
  lead_name: string | null
  user_name: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_TYPE_OPTIONS = [
  { value: "all", label: "Alle Typen" },
  { value: "status_change", label: "Statuswechsel" },
  { value: "anruf", label: "Anruf" },
  { value: "email", label: "E-Mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "notiz", label: "Notiz" },
  { value: "zuweisung", label: "Zuweisung" },
  { value: "rueckvergabe", label: "Rückvergabe" },
  { value: "termin_gebucht", label: "Termin gebucht" },
  { value: "termin_abgesagt", label: "Termin abgesagt" },
  { value: "nachkauf", label: "Nachkauf" },
  { value: "system", label: "System" },
]

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  status_change: ArrowRightLeft,
  anruf: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  notiz: StickyNote,
  zuweisung: GitBranch,
  rueckvergabe: RotateCcw,
  termin_gebucht: CalendarCheck,
  termin_abgesagt: CalendarX,
  nachkauf: ShoppingCart,
  system: Settings,
}

const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)

  if (compareDate.getTime() === today.getTime()) return "Heute"
  if (compareDate.getTime() === yesterday.getTime()) return "Gestern"

  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Users for filter
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  const supabase = useMemo(() => createClient(), [])
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Fetch users for filter dropdown
  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
      if (data) {
        setUsers(
          data.map((p) => ({ id: p.id, name: p.full_name ?? p.id }))
        )
      }
    }
    fetchUsers()
  }, [supabase])

  // Fetch activities
  const fetchActivities = useCallback(
    async (offset: number, reset: boolean) => {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      let query = supabase
        .from("lead_activities")
        .select(
          "id, lead_id, type, title, description, created_by, created_at"
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter as "status_change" | "anruf" | "email" | "whatsapp" | "notiz" | "zuweisung" | "rueckvergabe" | "termin_gebucht" | "termin_abgesagt" | "nachkauf" | "system")
      }
      if (userFilter && userFilter !== "all_users") {
        query = query.eq("created_by", userFilter)
      }
      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte("created_at", endDate.toISOString())
      }

      const { data: rawActivities } = await query

      if (!rawActivities || rawActivities.length === 0) {
        setHasMore(false)
        if (reset) {
          setActivities([])
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
        return
      }

      if (rawActivities.length < PAGE_SIZE) {
        setHasMore(false)
      }

      // Fetch lead names
      const leadIds = Array.from(new Set(rawActivities.map((a) => a.lead_id)))
      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, vorname, nachname")
        .in("id", leadIds)

      const leadNameMap: Record<string, string> = {}
      for (const l of leadsData ?? []) {
        leadNameMap[l.id] = [l.vorname, l.nachname].filter(Boolean).join(" ") || "Unbekannt"
      }

      // Fetch user names
      const userIds = Array.from(
        new Set(
          rawActivities.map((a) => a.created_by).filter(Boolean) as string[]
        )
      )
      const { data: profilesData } = userIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds)
        : { data: [] }

      const userNameMap: Record<string, string> = {}
      for (const p of profilesData ?? []) {
        userNameMap[p.id] = p.full_name ?? "System"
      }

      const mapped: ActivityEntry[] = rawActivities.map((a) => ({
        ...a,
        lead_name: leadNameMap[a.lead_id] ?? "Unbekannt",
        user_name: a.created_by ? (userNameMap[a.created_by] ?? "System") : "System",
      }))

      if (reset) {
        setActivities(mapped)
      } else {
        setActivities((prev) => [...prev, ...mapped])
      }

      if (reset) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
    },
    [supabase, typeFilter, userFilter, dateFrom, dateTo]
  )

  // Initial fetch + re-fetch on filter change
  useEffect(() => {
    setHasMore(true)
    fetchActivities(0, true)
  }, [fetchActivities])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchActivities(activities.length, false)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, activities.length, fetchActivities])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_activities",
        },
        async (payload) => {
          const newAct = payload.new as {
            id: string
            lead_id: string
            type: string
            title: string
            description: string | null
            created_by: string | null
            created_at: string
          }

          // Fetch lead name
          const { data: lead } = await supabase
            .from("leads")
            .select("vorname, nachname")
            .eq("id", newAct.lead_id)
            .single()

          let userName = "System"
          if (newAct.created_by) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", newAct.created_by)
              .single()
            userName = prof?.full_name ?? "System"
          }

          const entry: ActivityEntry = {
            ...newAct,
            lead_name: lead
              ? [lead.vorname, lead.nachname].filter(Boolean).join(" ") || "Unbekannt"
              : "Unbekannt",
            user_name: userName,
          }

          // Apply filters
          if (typeFilter !== "all" && newAct.type !== typeFilter) return
          if (userFilter && userFilter !== "all_users" && newAct.created_by !== userFilter) return

          setActivities((prev) => [entry, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, typeFilter, userFilter])

  // Group activities by day
  const groupedActivities = useMemo(() => {
    const groups: { key: string; label: string; items: ActivityEntry[] }[] = []
    const groupMap = new Map<string, ActivityEntry[]>()

    for (const act of activities) {
      const key = getDateKey(act.created_at)
      const existing = groupMap.get(key)
      if (existing) {
        existing.push(act)
      } else {
        const arr = [act]
        groupMap.set(key, arr)
        groups.push({ key, label: formatDayHeader(act.created_at), items: arr })
      }
    }

    return groups
  }, [activities])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aktivit&auml;ten</h1>
        <p className="text-muted-foreground">
          Chronologischer Feed aller Aktivit&auml;ten.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Typ
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Benutzer
          </label>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Alle Benutzer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_users">Alle Benutzer</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Von
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Bis
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {(typeFilter !== "all" || userFilter || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter("all")
              setUserFilter("")
              setDateFrom("")
              setDateTo("")
            }}
          >
            Filter zur&uuml;cksetzen
          </Button>
        )}
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Aktivit&auml;ten gefunden.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedActivities.map((group) => (
            <div key={group.key}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((act) => {
                  const IconComponent = ACTIVITY_ICONS[act.type] ?? Activity
                  return (
                    <div
                      key={act.id}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(act.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">
                            {act.user_name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatTime(act.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-foreground">
                          {act.title}
                        </p>
                        {act.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {act.description}
                          </p>
                        )}
                        <Link
                          href={`/admin/leads?lead=${act.lead_id}`}
                          className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                        >
                          {act.lead_name}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            {!hasMore && activities.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Alle Aktivit&auml;ten geladen.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
