import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge"
import { KontingentIndicator } from "@/components/dashboard/KontingentIndicator"
import { LeadActivityTimeline } from "@/components/dashboard/LeadActivityTimeline"
import { formatDate, formatEuro } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Tables } from "@/types/database"
import { BeraterDetailActions } from "./actions"
import {
  Mail,
  Phone,
  Calendar,
  Package,
  Activity,
  ArrowLeft,
  CreditCard,
  TrendingUp,
  ExternalLink,
  Clock,
  Target,
  PhoneCall,
  CheckCircle,
} from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

const ROLE_LABELS: Record<string, string> = {
  berater: "Berater",
  admin: "Admin",
  setter: "Setter",
  teamleiter: "Teamleiter",
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

export default async function BeraterDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch berater with profile
  const { data: berater, error } = await supabase
    .from("berater")
    .select(
      "*, profiles:profile_id(id, full_name, email, phone, role, created_at)"
    )
    .eq("id", id)
    .single()

  if (error || !berater) {
    notFound()
  }

  const profile = berater.profiles as unknown as {
    id: string
    full_name: string | null
    email: string
    phone: string | null
    role: string
    created_at: string
  } | null

  if (!profile) {
    notFound()
  }

  // Fetch assigned leads
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, vorname, nachname, email, telefon, status, source, created_at, zugewiesen_am, kontaktversuche, erster_kontakt_am, abschluss_am, sla_status, sla_deadline, first_contact_at"
    )
    .eq("berater_id", id)
    .order("zugewiesen_am", { ascending: false })
    .limit(20)

  const allLeads = leads ?? []

  // Fetch ALL leads for performance stats (not just last 20)
  const { data: allLeadsForStats } = await supabase
    .from("leads")
    .select(
      "id, status, zugewiesen_am, erster_kontakt_am, first_contact_at, sla_status, abschluss_am, kontaktversuche"
    )
    .eq("berater_id", id)

  const statsLeads = allLeadsForStats ?? []

  // Fetch recent activities for leads assigned to this berater
  const leadIds = allLeads.map((l) => l.id)

  type ActivityWithName = Tables<"lead_activities"> & {
    created_by_name?: string | null
  }

  let activities: ActivityWithName[] = []

  if (leadIds.length > 0) {
    const { data: acts } = await supabase
      .from("lead_activities")
      .select("*, profiles:created_by(full_name)")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false })
      .limit(20)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activities = (acts ?? []).map((a: any) => ({
      id: a.id,
      lead_id: a.lead_id,
      type: a.type,
      title: a.title,
      description: a.description,
      old_value: a.old_value,
      new_value: a.new_value,
      created_by: a.created_by,
      created_at: a.created_at,
      created_by_name: a.profiles?.full_name ?? null,
    }))
  }

  // Fetch zahlungen
  const { data: zahlungen } = await supabase
    .from("zahlungen")
    .select("*")
    .eq("berater_id", id)
    .order("created_at", { ascending: false })

  const allZahlungen = zahlungen ?? []

  // Payments this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const zahlungenDiesenMonat = allZahlungen.filter(
    (z) => new Date(z.created_at) >= startOfMonth
  )
  const umsatzDiesenMonat = zahlungenDiesenMonat.reduce(
    (acc, z) => acc + z.betrag_cents,
    0
  )

  // Performance stats
  const totalLeads = statsLeads.length
  const leadsWithContact = statsLeads.filter(
    (l) => l.first_contact_at || l.erster_kontakt_am
  ).length
  const contactRate =
    totalLeads > 0 ? Math.round((leadsWithContact / totalLeads) * 100) : 0

  const slaMetLeads = statsLeads.filter(
    (l) => l.sla_status === "met"
  ).length
  const slaTotal = statsLeads.filter(
    (l) => l.sla_status && l.sla_status !== "none"
  ).length
  const slaRate =
    slaTotal > 0 ? Math.round((slaMetLeads / slaTotal) * 100) : 0

  const closedLeads = statsLeads.filter(
    (l) => l.status === "abschluss"
  ).length
  const closeRate =
    totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0

  // Avg response time (from zugewiesen_am to first_contact_at)
  let avgResponseMinutes = 0
  const responseTimes: number[] = []
  for (const l of statsLeads) {
    const contactTime = l.first_contact_at ?? l.erster_kontakt_am
    if (l.zugewiesen_am && contactTime) {
      const diff =
        new Date(contactTime).getTime() - new Date(l.zugewiesen_am).getTime()
      if (diff > 0) {
        responseTimes.push(diff / 60000) // minutes
      }
    }
  }
  if (responseTimes.length > 0) {
    avgResponseMinutes = Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    )
  }

  const kontingent = berater.leads_kontingent ?? 0
  const verwendet = berater.leads_geliefert ?? 0
  const totalRevenue = berater.umsatz_gesamt_cents ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/berater"
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {profile.full_name ?? "Unbekannt"}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_COLORS[berater.status] ?? "bg-gray-100 text-gray-700"
                )}
              >
                {STATUS_LABELS[berater.status] ?? berater.status}
              </span>
              <Badge variant="outline" className="text-xs">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {profile.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {profile.phone ?? "-"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Seit {formatDate(profile.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Row 1: Abo, Kontingent, Umsatz */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Abo Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              Abo-Informationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Leads pro Monat
              </span>
              <span className="text-sm font-semibold">
                {berater.leads_pro_monat}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Preis pro Lead
              </span>
              <span className="text-sm font-semibold">
                {formatEuro(berater.preis_pro_lead_cents)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Setter-Typ</span>
              <span className="text-sm">
                {berater.setter_typ === "pool"
                  ? "LeadSolution Setter"
                  : berater.setter_typ === "eigen"
                    ? "Eigener Setter"
                    : "Kein Setter"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Subscription
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  berater.subscription_status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : berater.subscription_status === "past_due"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                )}
              >
                {berater.subscription_status ?? "Kein Abo"}
              </span>
            </div>
            {berater.abo_start && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Abo-Start
                </span>
                <span className="text-sm">{formatDate(berater.abo_start)}</span>
              </div>
            )}
            {berater.abo_mindestende && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Mindestende
                </span>
                <span className="text-sm">
                  {formatDate(berater.abo_mindestende)}
                </span>
              </div>
            )}
            {berater.stripe_customer_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Stripe Kunde
                </span>
                <a
                  href={`https://dashboard.stripe.com/customers/${berater.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  {berater.stripe_customer_id.slice(0, 18)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kontingent Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kontingent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KontingentIndicator
              geliefert={verwendet}
              kontingent={kontingent}
              nachkaufOffen={berater.nachkauf_leads_offen}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Leads gesamt</span>
              <span className="font-semibold">{berater.leads_gesamt}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nachkauf offen</span>
              <span className="font-semibold">
                {berater.nachkauf_leads_offen}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Umsatz Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" />
              Umsatz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold tracking-tight">
                {formatEuro(totalRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">Umsatz gesamt</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Diesen Monat</span>
              <span className="font-semibold">
                {formatEuro(umsatzDiesenMonat)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Zahlungen diesen Monat
              </span>
              <span className="font-semibold">
                {zahlungenDiesenMonat.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Avg. Reaktionszeit</span>
              </div>
              <p className="mt-1 text-2xl font-bold">
                {avgResponseMinutes > 0
                  ? avgResponseMinutes < 60
                    ? `${avgResponseMinutes} min`
                    : `${Math.round(avgResponseMinutes / 60)} Std`
                  : "-"}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                <span className="text-xs">SLA-Rate</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{slaRate}%</p>
              <p className="text-xs text-muted-foreground">
                {slaMetLeads}/{slaTotal}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <PhoneCall className="h-3.5 w-3.5" />
                <span className="text-xs">Kontaktrate</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{contactRate}%</p>
              <p className="text-xs text-muted-foreground">
                {leadsWithContact}/{totalLeads}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs">Abschlussrate</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{closeRate}%</p>
              <p className="text-xs text-muted-foreground">
                {closedLeads}/{totalLeads}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <BeraterDetailActions
        beraterId={berater.id}
        currentStatus={berater.status}
        currentLeadsProMonat={berater.leads_pro_monat}
        currentSetterTyp={berater.setter_typ ?? "keiner"}
      />

      {/* Assigned Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zugewiesene Leads (letzte 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead>Kontaktversuche</TableHead>
                <TableHead>Zugewiesen am</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLeads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Keine zugewiesenen Leads.
                  </TableCell>
                </TableRow>
              ) : (
                allLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="hover:underline"
                      >
                        {lead.vorname} {lead.nachname}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.email ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.telefon ?? "-"}
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="text-sm">{lead.source}</TableCell>
                    <TableCell className="text-center text-sm">
                      {lead.kontaktversuche}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.zugewiesen_am
                        ? formatDate(lead.zugewiesen_am)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Aktivitaets-Timeline (letzte 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadActivityTimeline activities={activities} />
        </CardContent>
      </Card>

      {/* Zahlungen Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Zahlungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Leads gutgeschrieben</TableHead>
                <TableHead>Mit Setter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allZahlungen.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Keine Zahlungen vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                allZahlungen.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="text-sm">
                      {formatDate(z.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {z.typ}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {z.paket_name ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatEuro(z.betrag_cents)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {z.leads_gutgeschrieben}
                    </TableCell>
                    <TableCell className="text-sm">
                      {z.hat_setter ? "Ja" : "Nein"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
