import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge"
import { SmartInsights } from "@/components/dashboard/SmartInsights"
import { RealtimeLeadFeed } from "@/components/dashboard/RealtimeLeadFeed"
import { KPIDashboard } from "@/components/dashboard/KPIDashboard"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import {
  RefreshCw,
  PlusCircle,
  UserPlus,
} from "lucide-react"

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Fetch recent 10 leads
  const { data: recentLeads } = await supabase
    .from("leads")
    .select(
      "id, vorname, nachname, email, telefon, status, source, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(10)

  // Fetch berater with profiles
  const { data: beraterList } = await supabase
    .from("berater")
    .select(
      "id, status, leads_kontingent, leads_geliefert, profiles:profile_id(full_name, email)"
    )
    .eq("status", "aktiv")
    .limit(10)

  const quelleLabel: Record<string, string> = {
    meta_lead_ad: "Meta Ad",
    landingpage: "Landingpage",
    manuell: "Manuell",
    import: "Import",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Gesamtüberblick über Leads, Berater und Umsatz.
        </p>
      </div>

      {/* KPI Dashboard — comprehensive overview */}
      <KPIDashboard />

      {/* Schnellaktionen */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="default">
              <Link href="/api/routing/distribute" prefetch={false}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Alle Leads verteilen
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/leads/neu">
                <PlusCircle className="mr-2 h-4 w-4" />
                Neuer Lead
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/berater">
                <UserPlus className="mr-2 h-4 w-4" />
                Neuer Berater einladen
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KI-Einblicke */}
      <SmartInsights />

      {/* Umsatzentwicklung */}
      <RevenueChart />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Leads</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Quelle</TableHead>
                  <TableHead className="hidden sm:table-cell">Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentLeads ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Noch keine Leads vorhanden.
                    </TableCell>
                  </TableRow>
                ) : (
                  (recentLeads ?? []).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.vorname} {lead.nachname}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {quelleLabel[lead.source] ?? lead.source}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatDate(lead.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Live Feed + Active Berater Summary */}
        <div className="space-y-6">
          <RealtimeLeadFeed />
          <Card>
          <CardHeader>
            <CardTitle>Aktive Berater</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kontingent</TableHead>
                  <TableHead>Auslastung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(beraterList ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Keine aktiven Berater.
                    </TableCell>
                  </TableRow>
                ) : (
                  (beraterList ?? []).map((berater) => {
                    const profile = berater.profiles as unknown as {
                      full_name: string | null
                    } | null
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
                        <TableCell>
                          {verwendet} / {kontingent}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{
                                  width: `${Math.min(100, prozent)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {prozent}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
