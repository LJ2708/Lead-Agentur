"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
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
import { ExternalLink } from "lucide-react"
import { InviteBeraterDialog } from "@/components/dashboard/InviteBeraterDialog"
import type { Database } from "@/types/database"

interface BeraterWithProfile {
  id: string
  status: string
  leads_geliefert: number
  leads_gesamt: number
  leads_kontingent: number
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

export default function AdminBeraterPage() {
  const [beraterList, setBeraterList] = useState<BeraterWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchBerater() {
      setLoading(true)

      // Fetch berater with joined profiles
      const { data: berater, error } = await supabase
        .from("berater")
        .select(
          "id, status, leads_geliefert, leads_gesamt, leads_kontingent, subscription_status, umsatz_gesamt_cents, profiles:profile_id(full_name, email)"
        )
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching berater:", error)
        setLoading(false)
        return
      }

      // For each berater, count their leads and sum revenue
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
  }, [supabase])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Berater-Verwaltung
          </h1>
          <p className="text-muted-foreground">
            Alle Berater und deren Kontingente verwalten.
          </p>
        </div>
        <InviteBeraterDialog />
      </div>

      <Card>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kontingent</TableHead>
                  <TableHead>Leads gesamt</TableHead>
                  <TableHead>Umsatz</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beraterList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Keine Berater gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  beraterList.map((berater) => {
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
                          {profile
                            ? (profile.full_name ?? "-")
                            : "-"}
                        </TableCell>
                        <TableCell>{profile?.email ?? "-"}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {berater.subscription_status === "active"
                              ? "Aktives Abo"
                              : berater.subscription_status ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              STATUS_COLORS[berater.status] ??
                                "bg-gray-100 text-gray-700"
                            )}
                          >
                            {STATUS_LABELS[berater.status] ?? berater.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {verwendet}/{kontingent}
                            </span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  prozent >= 90
                                    ? "bg-red-500"
                                    : prozent >= 70
                                      ? "bg-yellow-500"
                                      : "bg-emerald-500"
                                )}
                                style={{
                                  width: `${Math.min(100, prozent)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{berater.lead_count}</TableCell>
                        <TableCell>{formatEuro(berater.umsatz_gesamt_cents)}</TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/berater/${berater.id}`}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
