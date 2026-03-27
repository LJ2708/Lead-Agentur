"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LeadTable } from "@/components/dashboard/LeadTable"
import { LeadPipeline } from "@/components/dashboard/LeadPipeline"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { Database } from "@/types/database"

type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  berater?: {
    profiles?: { full_name: string | null }
  } | null
}

const STATUS_OPTIONS = [
  { value: "alle", label: "Alle Status" },
  { value: "neu", label: "Neu" },
  { value: "zugewiesen", label: "Zugewiesen" },
  { value: "kontaktversuch", label: "Kontaktversuch" },
  { value: "nicht_erreicht", label: "Nicht erreicht" },
  { value: "qualifiziert", label: "Qualifiziert" },
  { value: "termin", label: "Termin" },
  { value: "show", label: "Show" },
  { value: "no_show", label: "No-Show" },
  { value: "nachfassen", label: "Nachfassen" },
  { value: "abschluss", label: "Abschluss" },
  { value: "verloren", label: "Verloren" },
  { value: "warteschlange", label: "Warteschlange" },
]

const PAGE_SIZE = 20

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("alle")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchLeads = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from("leads")
      .select(
        "*, berater:berater_id(id, profiles:profile_id(full_name))",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search.trim()) {
      const term = `%${search.trim()}%`
      query = query.or(
        `vorname.ilike.${term},nachname.ilike.${term},email.ilike.${term},telefon.ilike.${term}`
      )
    }

    if (statusFilter !== "alle") {
      query = query.eq("status", statusFilter as Database["public"]["Enums"]["lead_status"])
    }

    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString())
    }

    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt("created_at", endDate.toISOString())
    }

    const { data, count, error } = await query

    if (error) {
      console.error("Error fetching leads:", error)
    } else {
      setLeads((data as Lead[]) ?? [])
      setTotalCount(count ?? 0)
    }

    setLoading(false)
  }, [page, search, statusFilter, dateFrom, dateTo, supabase])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    fetchLeads()
  }

  function clearFilters() {
    setSearch("")
    setStatusFilter("alle")
    setDateFrom("")
    setDateTo("")
    setPage(0)
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus as Database["public"]["Enums"]["lead_status"] })
        .eq("id", leadId)

      if (error) throw error

      toast.success("Status aktualisiert")
      fetchLeads()
    } catch (err) {
      console.error("Error updating lead status:", err)
      toast.error("Fehler beim Aktualisieren des Status")
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "alle" ||
    dateFrom !== "" ||
    dateTo !== ""

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alle Leads</h1>
          <p className="text-muted-foreground">
            {totalCount} Leads insgesamt
          </p>
        </div>
        <Link href="/admin/leads/neu">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            Neuer Lead
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-0">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Suche
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Name, E-Mail oder Telefon..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="w-[180px] space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val ?? "")
                    setPage(0)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Von
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(0)
                  }}
                  className="w-[150px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Bis
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(0)
                  }}
                  className="w-[150px]"
                />
              </div>

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="mr-1 h-3 w-3" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs defaultValue="tabelle">
        <TabsList>
          <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="tabelle">
          {/* Table */}
          <Card>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <LeadTable leads={leads} showBerater onLeadUpdated={fetchLeads} />
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Seite {page + 1} von {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pipeline">
          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[400px] w-[260px] shrink-0 rounded-lg" />
              ))}
            </div>
          ) : (
            <LeadPipeline
              leads={leads}
              onStatusChange={handleStatusChange}
              isAdmin
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
