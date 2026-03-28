"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Phone,
  CalendarCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads">;
type Activity = Tables<"lead_activities">;

interface DailyData {
  tag: string;
  anrufe: number;
  notizen: number;
}

export default function SetterStatsPage() {
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch all leads for this setter
    const { data: leadsData } = await supabase
      .from("leads")
      .select("*")
      .eq("setter_id", user.id);

    setLeads(leadsData ?? []);

    // Fetch all activities created by this user
    const { data: activitiesData } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    setActivities(activitiesData ?? []);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const callActivities = activities.filter((a) => a.type === "anruf");

    const leadsProcessedToday = new Set(
      callActivities
        .filter((a) => new Date(a.created_at) >= todayStart)
        .map((a) => a.lead_id)
    ).size;

    const leadsProcessedWeek = new Set(
      callActivities
        .filter((a) => new Date(a.created_at) >= weekStart)
        .map((a) => a.lead_id)
    ).size;

    const leadsProcessedMonth = new Set(
      callActivities
        .filter((a) => new Date(a.created_at) >= monthStart)
        .map((a) => a.lead_id)
    ).size;

    // Contact rate: % of leads with at least 1 call
    const leadsWithCalls = new Set(callActivities.map((a) => a.lead_id)).size;
    const contactRate =
      leads.length > 0
        ? Math.round((leadsWithCalls / leads.length) * 100)
        : 0;

    // Average calls per lead
    const avgCallsPerLead =
      leadsWithCalls > 0
        ? (callActivities.length / leadsWithCalls).toFixed(1)
        : "0";

    // Appointments booked
    const appointmentsBooked = leads.filter(
      (l) => l.status === "termin"
    ).length;

    return {
      leadsProcessedToday,
      leadsProcessedWeek,
      leadsProcessedMonth,
      contactRate,
      avgCallsPerLead,
      appointmentsBooked,
      totalLeads: leads.length,
    };
  }, [leads, activities]);

  // Daily activity chart data (last 7 days)
  const chartData = useMemo((): DailyData[] => {
    const days: DailyData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayLabel = date.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });

      const dayActivities = activities.filter((a) => {
        const t = new Date(a.created_at).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });

      days.push({
        tag: dayLabel,
        anrufe: dayActivities.filter((a) => a.type === "anruf").length,
        notizen: dayActivities.filter(
          (a) => a.type === "notiz" || a.type === "status_change"
        ).length,
      });
    }

    return days;
  }, [activities]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <BarChart3 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Meine Statistiken
          </h1>
          <p className="text-sm text-muted-foreground">
            Setter-Performance im Überblick
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalLeads}</p>
              <p className="text-xs text-muted-foreground">
                Leads gesamt
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <Phone className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.contactRate}%</p>
              <p className="text-xs text-muted-foreground">
                Kontaktrate
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgCallsPerLead}</p>
              <p className="text-xs text-muted-foreground">
                Anrufe/Lead
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <CalendarCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats.appointmentsBooked}
              </p>
              <p className="text-xs text-muted-foreground">
                Termine gebucht
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Processed Breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Heute bearbeitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.leadsProcessedToday}
            </p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diese Woche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.leadsProcessedWeek}
            </p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diesen Monat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.leadsProcessedMonth}
            </p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tägliche Aktivität (letzte 7 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="tag"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))",
                    fontSize: "13px",
                  }}
                />
                <Bar
                  dataKey="anrufe"
                  name="Anrufe"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="notizen"
                  name="Notizen/Status"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
