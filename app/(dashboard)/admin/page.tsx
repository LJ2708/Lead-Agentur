import { createClient } from "@/lib/supabase/server"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatEuro, formatDate } from "@/lib/utils"
import { Users, UserCheck, TrendingUp, Zap } from "lucide-react"

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Fetch total leads
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })

  // Fetch leads this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: leadsThisMonth } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStart)

  // Fetch active berater count
  const { count: activeBerater } = await supabase
    .from("berater")
    .select("*", { count: "exact", head: true })
    .eq("status", "aktiv")

  // Fetch total revenue from berater umsatz
  const { data: beraterRevenue } = await supabase
    .from("berater")
    .select("umsatz_gesamt_cents")

  const totalRevenue = (beraterRevenue ?? []).reduce(
    (sum, b) => sum + b.umsatz_gesamt_cents,
    0
  )

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
          Gesamtueberblick ueber Leads, Berater und Umsatz.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Leads gesamt"
          value={totalLeads ?? 0}
          description="Alle eingegangenen Leads"
          icon={Zap}
        />
        <StatsCard
          title="Leads diesen Monat"
          value={leadsThisMonth ?? 0}
          description={`Seit ${formatDate(monthStart)}`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Aktive Berater"
          value={activeBerater ?? 0}
          description="Mit Status aktiv"
          icon={Users}
        />
        <StatsCard
          title="Gesamtumsatz"
          value={formatEuro(totalRevenue)}
          description="Alle erfolgreichen Zahlungen"
          icon={UserCheck}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quelle</TableHead>
                  <TableHead>Erstellt</TableHead>
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
                      <TableCell>
                        {quelleLabel[lead.source] ?? lead.source}
                      </TableCell>
                      <TableCell>{formatDate(lead.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Active Berater Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Aktive Berater</CardTitle>
          </CardHeader>
          <CardContent>
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
  )
}
