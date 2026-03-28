"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: string
  user_id: string | null
  entity: string
  entity_id: string
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user_profile?: { full_name: string; email: string } | null
}

interface UserOption {
  id: string
  full_name: string
}

const PAGE_SIZE = 20

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const ENTITY_TYPES = ["leads", "berater", "profiles", "termine", "zahlungen", "routing_config", "budget_config", "lead_pakete", "nachkauf_pakete"]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAuditPage() {
  const supabase = createClient()

  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [filterUser, setFilterUser] = useState<string>("all")
  const [filterEntity, setFilterEntity] = useState<string>("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const [users, setUsers] = useState<UserOption[]>([])

  // Load user list for filter
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => {
        if (data) setUsers(data)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from("audit_log")
      .select("*, user_profile:user_id(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (filterUser !== "all") {
      query = query.eq("user_id", filterUser)
    }
    if (filterEntity !== "all") {
      query = query.eq("entity", filterEntity)
    }
    if (filterDateFrom) {
      query = query.gte("created_at", new Date(filterDateFrom).toISOString())
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo)
      to.setDate(to.getDate() + 1)
      query = query.lt("created_at", to.toISOString())
    }

    const { data, count } = await query

    setEntries((data ?? []) as unknown as AuditEntry[])
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [supabase, page, filterUser, filterEntity, filterDateFrom, filterDateTo])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [filterUser, filterEntity, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function formatTimestamp(ts: string) {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ts))
  }

  function renderDiff(oldVal: Record<string, unknown> | null, newVal: Record<string, unknown> | null) {
    if (!oldVal && !newVal) return <span className="text-muted-foreground">-</span>

    const allKeys = new Set([
      ...Object.keys(oldVal ?? {}),
      ...Object.keys(newVal ?? {}),
    ])

    const changedKeys = Array.from(allKeys).filter((k) => {
      const ov = oldVal ? JSON.stringify(oldVal[k]) : undefined
      const nv = newVal ? JSON.stringify(newVal[k]) : undefined
      return ov !== nv
    })

    if (changedKeys.length === 0) {
      return <span className="text-muted-foreground">Keine Änderungen</span>
    }

    return (
      <div className="space-y-1 text-xs">
        {changedKeys.map((key) => (
          <div key={key} className="flex flex-col gap-0.5 rounded bg-muted/50 px-2 py-1">
            <span className="font-medium text-foreground">{key}</span>
            <div className="flex items-center gap-2">
              {oldVal?.[key] !== undefined && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400">
                  {JSON.stringify(oldVal[key])}
                </span>
              )}
              <span className="text-muted-foreground">&rarr;</span>
              {newVal?.[key] !== undefined && (
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {JSON.stringify(newVal[key])}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            Alle Änderungen im System nachverfolgen.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Benutzer</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entität</Label>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {ENTITY_TYPES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Von</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Bis</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>Benutzer</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Entität</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Laden...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Keine Einträge gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const isExpanded = expandedId === entry.id
                  return (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatTimestamp(entry.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.user_profile?.full_name ?? entry.user_id ?? "System"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium",
                            ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-800"
                          )}
                        >
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.entity}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({entry.entity_id.slice(0, 8)}...)
                        </span>
                      </TableCell>
                      <TableCell>
                        {isExpanded
                          ? renderDiff(entry.old_value, entry.new_value)
                          : (
                            <span className="text-xs text-muted-foreground">
                              Klicken zum Aufklappen
                            </span>
                          )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {totalCount} Einträge insgesamt
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Seite {page} von {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
