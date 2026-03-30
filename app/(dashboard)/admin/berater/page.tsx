"use client"

import { useState, useEffect, useMemo } from "react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { Skeleton } from "@/components/ui/skeleton"
import { formatEuro } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ExternalLink, ArrowUpDown, Search } from "lucide-react"
import { InviteBeraterDialog } from "@/components/dashboard/InviteBeraterDialog"
import type { Database } from "@/types/database"

interface BeraterWithProfile {
  id: string
  status: string
  leads_geliefert: number
  leads_gesamt: number
  leads_kontingent: number
  leads_pro_monat: number
  preis_pro_lead_cents: number
  subscription_status: string | null
  umsatz_gesamt_cents: number
  profiles: {
    full_name: string | null
    email: string
  } | null
  lead_count: number
}

const STATUS_COLORS: Record<string, string> = {
  aktiv: "bg-emerald-100 text-emerald-700",
  pausiert: "bg-yellow-100 text-yellow-700",
  inaktiv: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-700",
}

const STATUS_LABELS: Record<string, string> = {
  aktiv: "Aktiv",
  pausiert: "Pausiert",
  inaktiv: "Inaktiv",
  pending: "Ausstehend",
}

type SortKey = "name" | "leads_pro_monat" | "preis" | "status" | "kontingent" | "lead_count" | "umsatz"
type SortDir = "asc" | "desc"

export default function AdminBeraterPage() {
  const [beraterList, setBeraterList] = useState<BeraterWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("alle")
  const [sortKey, setSortKey] = useState<SortKey>("lead_count")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const supabase = useMemo(
    () =>
      createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  useEffect(() => {
    async function fetchBerater() {
      setLoading(true)

      const { data: berater, error } = await supabase
        .from("berater")
        .select(
          "id, status, leads_geliefert, leads_gesamt, leads_kontingent, leads_pro_monat, preis_pro_lead_cents, subscription_status, umsatz_gesamt_cents, profiles:profile_id(full_name, email)"
        )
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching berater:", error)
        setLoading(false)
        return
      }

      const enriched: BeraterWithProfile[] = await Promise.all(
        (berater ?? []).map(async (b) => {
          const { count: leadCount } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("berater_id", b.id)

          const profile = b.profiles as unknown as BeraterWithProfile["profiles"]

          return {
            id: b.id,
            status: b.status,
            leads_geliefert: b.leads_geliefert,
            leads_gesamt: b.leads_gesamt,
            leads_kontingent: b.leads_kontingent,
            leads_pro_monat: b.leads_pro_monat,
            preis_pro_lead_cents: b.preis_pro_lead_cents,
            subscription_status: b.subscription_status,
            umsatz_gesamt_cents: b.umsatz_gesamt_cents,
            profiles: profile,
            lead_count: leadCount ?? 0,
          }
        })
      )

      setBeraterList(enriched)
      setLoading(false)
    }

    fetchBerater()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const filtered = useMemo(() => {
    let list = [...beraterList]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (b) =>
          (b.profiles?.full_name ?? "").toLowerCase().includes(q) ||
          (b.profiles?.email ?? "").toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== "alle") {
      list = list.filter((b) => b.status === statusFilter)
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? "")
          break
        case "leads_pro_monat":
          cmp = a.leads_pro_monat - b.leads_pro_monat
          break
        case "preis":
          cmp = a.preis_pro_lead_cents - b.preis_pro_lead_cents
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "kontingent":
          cmp = (a.leads_kontingent > 0 ? a.leads_geliefert / a.leads_kontingent : 0) -
                (b.leads_kontingent > 0 ? b.leads_geliefert / b.leads_kontingent : 0)
          break
        case "lead_count":
          cmp = a.lead_count - b.lead_count
          break
        case "umsatz":
          cmp = a.umsatz_gesamt_cents - b.umsatz_gesamt_cents
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return list
  }, [beraterList, search, statusFilter, sortKey, sortDir])

  // Stats
  const totalBerater = beraterList.length
  const aktiveBerater = beraterList.filter((b) => b.status === "aktiv").length
  const totalLeads = beraterList.reduce((s, b) => s + b.lead_count, 0)

  function SortHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          sortKey === sortKeyName ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => handleSort(sortKeyName)}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Berater-Verwaltung
          </h1>
          <p className="text-muted-foreground">
            {totalBerater} Berater ({aktiveBerater} aktiv) · {totalLeads} Leads gesamt
          </p>
        </div>
        <InviteBeraterDialog />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name oder E-Mail suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Status</SelectItem>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="pausiert">Pausiert</SelectItem>
                <SelectItem value="inaktiv">Inaktiv</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3 pt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortHeader label="Name" sortKeyName="name" /></TableHead>
                    <TableHead className="hidden md:table-cell">E-Mail</TableHead>
                    <TableHead><SortHeader label="Leads/Mon" sortKeyName="leads_pro_monat" /></TableHead>
                    <TableHead><SortHeader label="€/Lead" sortKeyName="preis" /></TableHead>
                    <TableHead><SortHeader label="Status" sortKeyName="status" /></TableHead>
                    <TableHead><SortHeader label="Kontingent" sortKeyName="kontingent" /></TableHead>
                    <TableHead><SortHeader label="Leads" sortKeyName="lead_count" /></TableHead>
                    <TableHead><SortHeader label="Umsatz" sortKeyName="umsatz" /></TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Keine Berater gefunden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((berater) => {
                      const profile = berater.profiles
                      const kontingent = berater.leads_kontingent ?? 0
                      const verwendet = berater.leads_geliefert ?? 0
                      const prozent =
                        kontingent > 0
                          ? Math.round((verwendet / kontingent) * 100)
                          : 0

                      return (
                        <TableRow key={berater.id}>
                          <TableCell className="font-medium">
                            {profile?.full_name ?? "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {profile?.email ?? "-"}
                          </TableCell>
                          <TableCell>{berater.leads_pro_monat}</TableCell>
                          <TableCell>{formatEuro(berater.preis_pro_lead_cents)}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                STATUS_COLORS[berater.status] ?? "bg-gray-100 text-gray-700"
                              )}
                            >
                              {STATUS_LABELS[berater.status] ?? berater.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm tabular-nums">
                                {verwendet}/{kontingent}
                              </span>
                              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    prozent >= 90
                                      ? "bg-red-500"
                                      : prozent >= 70
                                        ? "bg-yellow-500"
                                        : "bg-emerald-500"
                                  )}
                                  style={{ width: `${Math.min(100, prozent)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums font-medium">{berater.lead_count}</TableCell>
                          <TableCell className="tabular-nums">{formatEuro(berater.umsatz_gesamt_cents)}</TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/berater/${berater.id}`}
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              Details
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
