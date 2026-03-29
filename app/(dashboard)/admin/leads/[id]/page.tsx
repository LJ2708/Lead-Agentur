import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LeadActivityTimeline } from "@/components/dashboard/LeadActivityTimeline";
import { TagManager } from "@/components/dashboard/TagManager";
import { RichNoteEditor } from "@/components/dashboard/RichNoteEditor";
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge";
import {
  formatDate,
  cn,
} from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageCircle,
  User,
  Star,
  Shield,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { AdminLeadActions } from "./AdminLeadActions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return `${formatDate(dateStr)}, ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "E-Mail",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminLeadDetailPage({ params }: PageProps) {
  const { id: leadId } = await params;
  const supabase = await createClient();

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "teamleiter")) {
    redirect("/berater");
  }

  // Fetch lead
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) notFound();

  // Fetch berater info (if assigned)
  let beraterName: string | null = null;
  if (lead.berater_id) {
    const { data: berater } = await supabase
      .from("berater")
      .select("id, profiles:profile_id(full_name)")
      .eq("id", lead.berater_id)
      .single();

    type BeraterWithProfile = {
      id: string;
      profiles: { full_name: string } | null;
    };
    const b = berater as unknown as BeraterWithProfile | null;
    beraterName = b?.profiles?.full_name ?? null;
  }

  // Fetch setter info (if assigned)
  let setterName: string | null = null;
  if (lead.setter_id) {
    const { data: setter } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", lead.setter_id)
      .single();
    setterName = setter?.full_name ?? null;
  }

  // Fetch ALL activities with creator names
  const { data: activitiesData } = await supabase
    .from("lead_activities")
    .select("*, profiles:created_by(full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  type ActivityRow = {
    id: string;
    lead_id: string;
    type: string;
    title: string;
    description: string | null;
    old_value: string | null;
    new_value: string | null;
    created_by: string | null;
    created_at: string;
    profiles: { full_name: string } | null;
  };

  const activities = ((activitiesData ?? []) as unknown as ActivityRow[]).map(
    (a) => ({
      id: a.id,
      lead_id: a.lead_id,
      type: a.type as "status_change" | "anruf" | "email" | "whatsapp" | "notiz" | "zuweisung" | "rueckvergabe" | "termin_gebucht" | "termin_abgesagt" | "nachkauf" | "system",
      title: a.title,
      description: a.description,
      old_value: a.old_value,
      new_value: a.new_value,
      created_by: a.created_by,
      created_at: a.created_at,
      created_by_name: a.profiles?.full_name ?? null,
    })
  );

  // Nachrichten
  const { data: nachrichten } = await supabase
    .from("nachrichten")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  // Termine
  const { data: termine } = await supabase
    .from("termine")
    .select("*")
    .eq("lead_id", leadId)
    .order("datum", { ascending: false });

  // Berater list for reassignment
  const { data: beraterList } = await supabase
    .from("berater")
    .select("id, profiles:profile_id(full_name)")
    .eq("status", "aktiv");

  type BeraterOption = {
    id: string;
    profiles: { full_name: string } | null;
  };
  const beraterOptions = ((beraterList ?? []) as unknown as BeraterOption[]).map(
    (b) => ({
      id: b.id,
      name: b.profiles?.full_name ?? "Unbekannt",
    })
  );

  // SLA status
  const slaDeadline = lead.sla_deadline
    ? new Date(lead.sla_deadline)
    : null;
  const slaExpired = slaDeadline ? slaDeadline < new Date() : false;
  const slaStatus = lead.sla_status ?? (slaExpired ? "breached" : "ok");

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin/leads"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {lead.vorname ?? ""} {lead.nachname ?? ""}
            </h1>
            <LeadStatusBadge status={lead.status} />
            {lead.is_nachkauf && (
              <Badge variant="outline" className="text-xs">
                Nachkauf
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Lead #{leadId.slice(0, 8)} &middot; Erstellt am{" "}
            {formatDate(lead.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- Main Content (left 2/3) ---- */}
        <div className="space-y-6 lg:col-span-2">
          {/* Lead Info Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead-Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.telefon && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${lead.telefon}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.telefon}
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Quelle:</span>{" "}
                  <span className="font-medium">{lead.source}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Kontaktversuche:</span>{" "}
                  <span className="font-medium">
                    {lead.kontaktversuche} / {lead.max_kontaktversuche ?? 5}
                  </span>
                </div>
                {lead.campaign && (
                  <div>
                    <span className="text-muted-foreground">Kampagne:</span>{" "}
                    <span className="font-medium">{lead.campaign}</span>
                  </div>
                )}
                {lead.erster_kontakt_am && (
                  <div>
                    <span className="text-muted-foreground">Erster Kontakt:</span>{" "}
                    <span className="font-medium">
                      {formatDate(lead.erster_kontakt_am)}
                    </span>
                  </div>
                )}
                {lead.contact_outcome && (
                  <div>
                    <span className="text-muted-foreground">Kontaktergebnis:</span>{" "}
                    <span className="font-medium">{lead.contact_outcome}</span>
                  </div>
                )}
              </div>

              {/* UTM */}
              {(lead.utm_source || lead.utm_campaign) && (
                <>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-muted-foreground">
                      Kampagnen-Daten
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {lead.utm_source && (
                        <div>
                          <span className="text-muted-foreground">Source:</span>{" "}
                          {lead.utm_source}
                        </div>
                      )}
                      {lead.utm_medium && (
                        <div>
                          <span className="text-muted-foreground">Medium:</span>{" "}
                          {lead.utm_medium}
                        </div>
                      )}
                      {lead.utm_campaign && (
                        <div>
                          <span className="text-muted-foreground">Kampagne:</span>{" "}
                          {lead.utm_campaign}
                        </div>
                      )}
                      {lead.utm_content && (
                        <div>
                          <span className="text-muted-foreground">Content:</span>{" "}
                          {lead.utm_content}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Assignment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Zuweisung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Berater</p>
                  <p className="text-sm font-medium">
                    {beraterName ?? "Nicht zugewiesen"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Setter</p>
                  <p className="text-sm font-medium">
                    {setterName ?? "Kein Setter"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Zugewiesen am</p>
                  <p className="text-sm font-medium">
                    {lead.zugewiesen_am
                      ? formatTimestamp(lead.zugewiesen_am)
                      : "Nicht zugewiesen"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SLA Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                SLA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="text-sm font-medium">
                    {slaDeadline
                      ? formatTimestamp(slaDeadline.toISOString())
                      : "Keine SLA"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1.5">
                    {slaStatus === "breached" ? (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">
                          SLA verletzt
                        </span>
                      </>
                    ) : slaStatus === "warning" ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600">
                          Warnung
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          OK
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {lead.accepted_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Akzeptiert am</p>
                    <p className="text-sm font-medium">
                      {formatTimestamp(lead.accepted_at)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Nachrichten */}
          {(nachrichten ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="h-5 w-5" />
                  Nachrichten ({(nachrichten ?? []).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(nachrichten ?? []).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "rounded-lg border p-3",
                        n.direction === "outbound"
                          ? "ml-6 bg-blue-50"
                          : "mr-6 bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {CHANNEL_LABELS[n.channel] ?? n.channel} -{" "}
                          {n.direction === "outbound"
                            ? "Ausgehend"
                            : "Eingehend"}
                        </Badge>
                        <span>{formatTimestamp(n.created_at)}</span>
                      </div>
                      {n.subject && (
                        <p className="mt-1 text-sm font-medium">{n.subject}</p>
                      )}
                      {n.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {n.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Termine */}
          {(termine ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Termine ({(termine ?? []).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(termine ?? []).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatTimestamp(t.datum)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dauer: {t.dauer_minuten} Min. &middot; Status:{" "}
                          {t.status}
                        </p>
                        {t.notizen && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t.notizen}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          t.status === "geplant"
                            ? "default"
                            : t.status === "abgeschlossen"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Aktivitäten ({activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>

        {/* ---- Sidebar (right 1/3) ---- */}
        <div className="space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagManager leadId={leadId} />
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Admin-Aktionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminLeadActions
                leadId={leadId}
                currentStatus={lead.status}
                currentBeraterId={lead.berater_id}
                beraterOptions={beraterOptions}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4" />
                Notiz hinzufügen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RichNoteEditor leadId={leadId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
