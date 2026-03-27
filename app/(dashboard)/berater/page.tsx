import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { berechnePacingInfo } from "@/lib/routing/pacing";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { KontingentIndicator } from "@/components/dashboard/KontingentIndicator";
import { PacingChart } from "@/components/dashboard/PacingChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  CalendarDays,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default async function BeraterDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "berater") {
    redirect("/login");
  }

  // Fetch berater record
  const { data: berater } = await supabase
    .from("berater")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!berater) {
    redirect("/login");
  }

  // Fetch leads assigned to this berater
  const { data: allLeads } = await supabase
    .from("leads")
    .select("*")
    .eq("berater_id", berater.id)
    .order("created_at", { ascending: false });

  const leads = allLeads ?? [];

  // Stats
  const offeneLeads = leads.filter(
    (l) =>
      !["abschluss", "verloren"].includes(l.status)
  ).length;

  // Termine diese Woche
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: termineWoche } = await supabase
    .from("termine")
    .select("id")
    .eq("berater_id", berater.id)
    .gte("datum", startOfWeek.toISOString())
    .lte("datum", endOfWeek.toISOString());

  const termineCount = termineWoche?.length ?? 0;

  // Nachkauf leads (leads from nachkauf that are still open)
  const nachkaufOffen = leads.filter(
    (l) =>
      l.status === "zugewiesen" || l.status === "kontaktversuch"
  ).length;

  // Pacing
  const kontingent = berater.leads_kontingent;
  const geliefert = berater.leads_geliefert;
  const pacing = berechnePacingInfo(kontingent, geliefert);

  // Recent leads (last 5)
  const recentLeads = leads.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Willkommen, {(profile as any).full_name?.split(" ")[0] ?? "Berater"}
          </h1>
          <p className="text-muted-foreground">
            Ihr Lead-Dashboard im Überblick
          </p>
        </div>
        <Button asChild>
          <Link href="/berater/nachkauf">
            <ShoppingCart className="h-4 w-4" data-icon="inline-start" />
            Leads nachkaufen
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Kontingent"
          value={`${geliefert} / ${kontingent}`}
          description={`${pacing.prozent}% ausgeschöpft`}
          icon={BarChart3}
        />
        <StatsCard
          title="Offene Leads"
          value={offeneLeads}
          description="Aktive Leads in Bearbeitung"
          icon={Users}
        />
        <StatsCard
          title="Termine diese Woche"
          value={termineCount}
          description="Geplante Gespräche"
          icon={CalendarDays}
        />
        <StatsCard
          title="Nachkauf-Leads offen"
          value={nachkaufOffen}
          description="Noch nicht qualifiziert"
          icon={ShoppingCart}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Kontingent Indicator */}
        <Card>
          <CardHeader>
            <CardTitle>Kontingent-Fortschritt</CardTitle>
          </CardHeader>
          <CardContent>
            <KontingentIndicator
              geliefert={geliefert}
              kontingent={kontingent}
              nachkaufOffen={nachkaufOffen}
            />
          </CardContent>
        </Card>

        {/* Pacing Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Pacing</CardTitle>
          </CardHeader>
          <CardContent>
            <PacingChart kontingent={kontingent} geliefert={geliefert} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Letzte Leads</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/berater/leads">
                Alle anzeigen
                <ArrowRight className="h-3.5 w-3.5" data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Leads vorhanden.
            </p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/berater/leads/${lead.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {lead.vorname} {lead.nachname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.email}
                      {lead.zugewiesen_am &&
                        ` · Zugewiesen am ${formatDate(lead.zugewiesen_am)}`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(lead.status)}`}
                  >
                    {getStatusLabel(lead.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
