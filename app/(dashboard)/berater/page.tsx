import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SmartInbox } from "@/components/dashboard/SmartInbox";
import { PerformanceWidget } from "@/components/dashboard/PerformanceWidget";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { BehavioralNudge } from "@/components/dashboard/BehavioralNudge";
import { KontingentIndicator } from "@/components/dashboard/KontingentIndicator";
import { PacingChart } from "@/components/dashboard/PacingChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Phone,
  Target,
  CalendarDays,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

export default async function BeraterDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "berater") {
    redirect("/login");
  }

  const { data: berater } = await supabase
    .from("berater")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!berater) {
    redirect("/login");
  }

  // Fetch active leads
  const { data: allLeads } = await supabase
    .from("leads")
    .select("*")
    .eq("berater_id", berater.id);

  const leads = allLeads ?? [];

  const offeneLeads = leads.filter(
    (l) => !["abschluss", "verloren"].includes(l.status)
  ).length;

  const slaActive = leads.filter((l) => l.sla_status === "active").length;

  // Termine diese Woche
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
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

  const kontingent = berater.leads_kontingent;
  const geliefert = berater.leads_geliefert;
  const nachkaufOffen = berater.nachkauf_leads_offen;

  const firstName = profile.full_name?.split(" ")[0] ?? "Berater";

  return (
    <div className="space-y-4">
      {/* Header — compact */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Hallo, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {offeneLeads} offene Leads
          {slaActive > 0 && (
            <span className="ml-2 text-red-600 font-medium">
              {" \u2022 "}{slaActive} SLA aktiv
            </span>
          )}
          {" \u2022 "}{geliefert}/{kontingent} Kontingent
          {" \u2022 "}{termineCount} Termine
        </p>
      </div>

      {/* Compact stats row */}
      <div className="grid grid-cols-4 gap-2">
        <MiniStat
          icon={<Phone className="h-4 w-4 text-blue-600" />}
          value={offeneLeads}
          label="Offen"
        />
        <MiniStat
          icon={<Target className="h-4 w-4 text-green-600" />}
          value={`${geliefert}/${kontingent}`}
          label="Kontingent"
        />
        <MiniStat
          icon={<CalendarDays className="h-4 w-4 text-purple-600" />}
          value={termineCount}
          label="Termine"
        />
        <MiniStat
          icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
          value={nachkaufOffen}
          label="Nachkauf"
        />
      </div>

      {/* Behavioral Nudge — compact tip */}
      <BehavioralNudge beraterId={berater.id} />

      {/* MAIN: Smart Inbox — the primary work area */}
      <SmartInbox beraterId={berater.id} />

      {/* Collapsible: Performance & Pacing */}
      <CollapsibleSection title="Meine Performance">
        <div className="grid gap-4 lg:grid-cols-2">
          <PerformanceWidget beraterId={berater.id} />
          <Leaderboard maxRows={5} compact />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Kontingent & Pacing">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Kontingent</CardTitle>
            </CardHeader>
            <CardContent>
              <KontingentIndicator
                geliefert={geliefert}
                kontingent={kontingent}
                nachkaufOffen={nachkaufOffen}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pacing</CardTitle>
            </CardHeader>
            <CardContent>
              <PacingChart kontingent={kontingent} geliefert={geliefert} />
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
      {icon}
      <div className="min-w-0">
        <p className="text-sm font-bold leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-accent transition-colors">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
