import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge"
import { formatDate, formatEuro } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { BeraterDetailActions } from "./actions"
import {
  User,
  Mail,
  Phone,
  Calendar,
  Package,
  Activity,
} from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

const ACTIVITY_LABELS: Record<string, string> = {
  status_change: "Statusänderung",
  anruf: "Anruf",
  email: "E-Mail",
  whatsapp: "WhatsApp",
  notiz: "Notiz",
  zuweisung: "Zuweisung",
  rueckvergabe: "Rückvergabe",
  termin_gebucht: "Termin gebucht",
  termin_abgesagt: "Termin abgesagt",
  nachkauf: "Nachkauf",
  system: "System",
}

export default async function BeraterDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch berater with profile
  const { data: berater, error } = await supabase
    .from("berater")
    .select(
      "*, profiles:profile_id(id, full_name, email, phone, created_at)"
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
    created_at: string
  } | null

  if (!profile) {
    notFound()
  }

  const kontingent = berater.leads_kontingent ?? 0
  const verwendet = berater.leads_geliefert ?? 0
  const prozent = kontingent > 0 ? Math.round((verwendet / kontingent) * 100) : 0

  // Fetch assigned leads
  const { data: leads } = await supabase
    .from("leads")
    .select("id, vorname, nachname, email, telefon, status, source, created_at, zugewiesen_am")
    .eq("berater_id", id)
    .order("zugewiesen_am", { ascending: false })
    .limit(20)

  // Fetch recent activities for leads assigned to this berater
  const leadIds = (leads ?? []).map((l) => l.id)
  let activities: Array<{
    id: string
    type: string
    description: string | null
    created_at: string
    lead_id: string
  }> = []

  if (leadIds.length > 0) {
    const { data: acts } = await supabase
      .from("lead_activities")
      .select("id, type, description, created_at, lead_id")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false })
      .limit(15)

    activities = acts ?? []
  }

  // Fetch revenue from berater's umsatz_gesamt_cents
  const totalRevenue = berater.umsatz_gesamt_cents ?? 0

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {profile.full_name ?? "Unbekannt"}
          </h1>
          <p className="text-muted-foreground">Berater-Detail</p>
        </div>
        <BeraterDetailActions
          beraterId={berater.id}
          currentStatus={berater.status}
        />
      </div>

      {/* Profile Info + Subscription */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.phone ?? "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Seit {formatDate(profile.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_COLORS[berater.status] ?? "bg-gray-100 text-gray-700"
                )}
              >
                {STATUS_LABELS[berater.status] ?? berater.status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              Abo-Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Subscription
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  berater.subscription_status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-700"
                )}
              >
                {berater.subscription_status ?? "Kein Abo"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Umsatz</span>
              <span className="text-sm font-semibold">
                {formatEuro(totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Leads Kontingent
              </span>
              <span className="text-sm">{berater.leads_kontingent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Leads gesamt
              </span>
              <span className="text-sm">{berater.leads_gesamt}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kontingent-Fortschritt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{verwendet}</p>
              <p className="text-sm text-muted-foreground">
                von {kontingent} Leads geliefert
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fortschritt</span>
                <span>{prozent}%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    prozent >= 90
                      ? "bg-emerald-500"
                      : prozent >= 50
                        ? "bg-blue-500"
                        : prozent >= 25
                          ? "bg-yellow-500"
                          : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, prozent)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Offen</span>
              <span className="font-semibold">
                {Math.max(0, kontingent - verwendet)} Leads
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zugewiesene Leads</CardTitle>
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
                <TableHead>Zugewiesen am</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leads ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Keine zugewiesenen Leads.
                  </TableCell>
                </TableRow>
              ) : (
                (leads ?? []).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.vorname} {lead.nachname}
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.telefon ?? "-"}</TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>
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
            Aktivitaets-Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Keine Aktivitaeten vorhanden.
            </p>
          ) : (
            <div className="relative space-y-0">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4 pb-6">
                  {index < activities.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
                  )}
                  <div className="relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-blue-500 bg-white" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {ACTIVITY_LABELS[activity.type] ?? activity.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
