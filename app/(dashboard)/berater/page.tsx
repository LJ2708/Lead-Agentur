import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { berechnePacingInfo } from "@/lib/routing/pacing";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { KontingentIndicator } from "@/components/dashboard/KontingentIndicator";
import { PacingChart } from "@/components/dashboard/PacingChart";
import { SmartInbox } from "@/components/dashboard/SmartInbox";
import { PerformanceWidget } from "@/components/dashboard/PerformanceWidget";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { BehavioralNudge } from "@/components/dashboard/BehavioralNudge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  BarChart3,
  Users,
  CalendarDays,
  ShoppingCart,
} from "lucide-react";

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

  if (!profile || profile.role !== "berater") {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Willkommen, {profile.full_name?.split(" ")[0] ?? "Berater"}
          </h1>
          <p className="text-muted-foreground">
            Ihr Lead-Dashboard im \u00dcberblick
          </p>
        </div>
        <Button asChild>
          <Link href="/berater/nachkauf">
            <ShoppingCart className="h-4 w-4" data-icon="inline-start" />
            Leads nachkaufen
          </Link>
        </Button>
      </div>

      {/* Stats Cards - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="Kontingent"
          value={`${geliefert} / ${kontingent}`}
          description={`${pacing.prozent}% ausgesch\u00f6pft`}
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
          description="Geplante Gespr\u00e4che"
          icon={CalendarDays}
        />
        <StatsCard
          title="Nachkauf-Leads offen"
          value={nachkaufOffen}
          description="Noch nicht qualifiziert"
          icon={ShoppingCart}
        />
      </div>

      {/* Kontingent + Pacing: stack on mobile */}
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

      {/* Behavioral Nudge */}
      <BehavioralNudge beraterId={berater.id} />

      {/* Performance + Leaderboard: stack on mobile */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceWidget beraterId={berater.id} />
        <Leaderboard maxRows={5} compact />
      </div>

      {/* Smart Inbox - full width on all screens */}
      <SmartInbox beraterId={berater.id} />
    </div>
  );
}
