"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro, cn } from "@/lib/utils";
import {
  Camera,
  Save,
  Loader2,
  Zap,
  Shield,
  Target,
  Flame,
  Trophy,
  TrendingUp,
  Clock,
  Star,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
}

interface BeraterData {
  id: string;
  leads_kontingent: number;
  leads_geliefert: number;
  leads_pro_monat: number;
  preis_pro_lead_cents: number;
  hat_setter: boolean;
  leads_gesamt: number;
  umsatz_gesamt_cents: number;
  status: string;
  subscription_status: string | null;
}

interface BadgeInfo {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  earned: boolean;
  color: string;
}

interface PerformanceStats {
  leadsThisMonth: number;
  abschluesseThisMonth: number;
  avgAcceptSeconds: number;
  slaRate: number;
  activeDaysStreak: number;
  isTopPerformer: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const DAY_LABELS: Record<number, string> = {
  0: "So",
  1: "Mo",
  2: "Di",
  3: "Mi",
  4: "Do",
  5: "Fr",
  6: "Sa",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BeraterProfilPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [berater, setBerater] = useState<BeraterData | null>(null);
  const [performance, setPerformance] = useState<PerformanceStats | null>(null);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [workingHours, setWorkingHours] = useState<
    { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, avatar_url")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setEditName(profileData.full_name);
      setEditPhone(profileData.phone ?? "");
    }

    // Berater
    const { data: beraterData } = await supabase
      .from("berater")
      .select(
        "id, leads_kontingent, leads_geliefert, leads_pro_monat, preis_pro_lead_cents, hat_setter, leads_gesamt, umsatz_gesamt_cents, status, subscription_status"
      )
      .eq("profile_id", user.id)
      .single();

    if (beraterData) {
      setBerater(beraterData);

      // Working hours
      const { data: wh } = await supabase
        .from("working_hours")
        .select("day_of_week, start_time, end_time, is_active")
        .eq("berater_id", beraterData.id)
        .order("day_of_week");

      setWorkingHours(wh ?? []);

      // Performance stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Leads this month
      const { count: leadsThisMonth } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("berater_id", beraterData.id)
        .gte("zugewiesen_am", monthStart);

      // Abschlüsse this month
      const { count: abschluesseThisMonth } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("berater_id", beraterData.id)
        .eq("status", "abschluss")
        .gte("abschluss_am", monthStart);

      // Average accept time
      const { data: acceptedLeads } = await supabase
        .from("leads")
        .select("zugewiesen_am, accepted_at")
        .eq("berater_id", beraterData.id)
        .not("accepted_at", "is", null)
        .not("zugewiesen_am", "is", null)
        .gte("zugewiesen_am", monthStart);

      let avgAcceptSeconds = 0;
      if (acceptedLeads && acceptedLeads.length > 0) {
        const totalSeconds = acceptedLeads.reduce((sum, l) => {
          if (!l.zugewiesen_am || !l.accepted_at) return sum;
          const diff =
            (new Date(l.accepted_at).getTime() -
              new Date(l.zugewiesen_am).getTime()) /
            1000;
          return sum + diff;
        }, 0);
        avgAcceptSeconds = totalSeconds / acceptedLeads.length;
      }

      // SLA rate this month
      const { count: totalSlaLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("berater_id", beraterData.id)
        .not("sla_deadline", "is", null)
        .gte("zugewiesen_am", monthStart);

      const { count: slaBreached } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("berater_id", beraterData.id)
        .eq("sla_status", "breached")
        .gte("zugewiesen_am", monthStart);

      const totalSla = totalSlaLeads ?? 0;
      const breached = slaBreached ?? 0;
      const slaRate = totalSla > 0 ? ((totalSla - breached) / totalSla) * 100 : 100;

      // Active days streak (check activities by day)
      const { data: recentActivities } = await supabase
        .from("lead_activities")
        .select("created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      let streak = 0;
      if (recentActivities && recentActivities.length > 0) {
        const activeDays = new Set(
          recentActivities.map((a) =>
            new Date(a.created_at).toISOString().slice(0, 10)
          )
        );
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const dayStr = checkDate.toISOString().slice(0, 10);
          if (activeDays.has(dayStr)) {
            streak++;
          } else {
            break;
          }
        }
      }

      // Top performer check (simple: check if highest abschluss count)
      const isTopPerformer = (abschluesseThisMonth ?? 0) >= 5;

      const stats: PerformanceStats = {
        leadsThisMonth: leadsThisMonth ?? 0,
        abschluesseThisMonth: abschluesseThisMonth ?? 0,
        avgAcceptSeconds,
        slaRate,
        activeDaysStreak: streak,
        isTopPerformer,
      };

      setPerformance(stats);

      // Calculate badges
      const earnedBadges: BadgeInfo[] = [
        {
          id: "speed_demon",
          icon: Zap,
          title: "Speed Demon",
          description: "Durchschnittliche Annahmezeit unter 60 Sekunden",
          earned: stats.avgAcceptSeconds > 0 && stats.avgAcceptSeconds < 60,
          color: "text-amber-500",
        },
        {
          id: "sla_champion",
          icon: Shield,
          title: "SLA Champion",
          description: "100% SLA-Rate diesen Monat",
          earned: stats.slaRate === 100 && totalSla > 0,
          color: "text-blue-500",
        },
        {
          id: "closer",
          icon: Target,
          title: "Closer",
          description: "5+ Abschlüsse diesen Monat",
          earned: stats.abschluesseThisMonth >= 5,
          color: "text-green-500",
        },
        {
          id: "streak",
          icon: Flame,
          title: "Streak",
          description: "7+ Tage in Folge aktiv",
          earned: stats.activeDaysStreak >= 7,
          color: "text-orange-500",
        },
        {
          id: "top_performer",
          icon: Trophy,
          title: "Top Performer",
          description: "#1 auf dem Leaderboard",
          earned: stats.isTopPerformer,
          color: "text-purple-500",
        },
      ];
      setBadges(earnedBadges);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setProfile({
      ...profile,
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
    });
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!profile || !e.target.files?.[0]) return;
    setUploading(true);

    const file = e.target.files[0];
    const ext = file.name.split(".").pop();
    const filePath = `avatars/${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      setProfile({ ...profile, avatar_url: publicUrl });
    }

    setUploading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!profile || !berater) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mein Profil"
        description="Verwalten Sie Ihre persönlichen Informationen und sehen Sie Ihre Leistungsdaten"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-blue-600 text-white shadow hover:bg-blue-700 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <h2 className="mt-4 text-xl font-bold">{profile.full_name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.phone && (
                <p className="text-sm text-muted-foreground">{profile.phone}</p>
              )}

              <Badge
                variant={berater.status === "aktiv" ? "default" : "secondary"}
                className="mt-3"
              >
                {berater.status === "aktiv" ? "Aktiv" : berater.status}
              </Badge>
            </div>

            <Separator className="my-6" />

            {/* Edit Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Vollständiger Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">E-Mail</Label>
                <Input value={profile.email} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Telefon</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+49..."
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving || !editName.trim()}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Profil speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Performance Stats */}
          {performance && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Leistungsübersicht
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {performance.leadsThisMonth}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Leads diesen Monat
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {performance.abschluesseThisMonth}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Abschlüsse
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {performance.avgAcceptSeconds > 0
                        ? `${Math.round(performance.avgAcceptSeconds)}s`
                        : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ø Annahmezeit
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {Math.round(performance.slaRate)}%
                    </p>
                    <p className="text-xs text-muted-foreground">SLA-Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Aktuelles Abonnement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Leads / Monat</p>
                  <p className="text-lg font-bold">{berater.leads_pro_monat}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preis / Lead</p>
                  <p className="text-lg font-bold">
                    {formatEuro(berater.preis_pro_lead_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Setter</p>
                  <p className="text-lg font-bold">
                    {berater.hat_setter ? "Ja" : "Nein"}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Kontingent</p>
                  <p className="text-sm font-medium">
                    {berater.leads_geliefert} / {berater.leads_kontingent}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leads gesamt</p>
                  <p className="text-sm font-medium">{berater.leads_gesamt}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Abonnement-Status
                  </p>
                  <Badge
                    variant={
                      berater.subscription_status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {berater.subscription_status ?? "Kein Abo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          {workingHours.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Arbeitszeiten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {workingHours.map((wh) => (
                    <div
                      key={wh.day_of_week}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2",
                        !wh.is_active && "opacity-50"
                      )}
                    >
                      <span className="text-sm font-medium">
                        {DAY_LABELS[wh.day_of_week] ?? `Tag ${wh.day_of_week}`}
                      </span>
                      {wh.is_active ? (
                        <span className="text-sm text-muted-foreground">
                          {wh.start_time.slice(0, 5)} - {wh.end_time.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Frei
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5" />
                Auszeichnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((badge) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 transition-opacity",
                        badge.earned
                          ? "border-current/10 bg-gradient-to-br from-background to-muted/30"
                          : "opacity-40"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          badge.earned
                            ? "bg-current/10"
                            : "bg-gray-100"
                        )}
                      >
                        <BadgeIcon
                          className={cn(
                            "h-5 w-5",
                            badge.earned ? badge.color : "text-gray-400"
                          )}
                        />
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            badge.earned ? "" : "text-muted-foreground"
                          )}
                        >
                          {badge.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {badge.description}
                        </p>
                        {badge.earned && (
                          <Badge
                            variant="outline"
                            className="mt-1 border-green-200 bg-green-50 text-green-700 text-xs"
                          >
                            Erreicht
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
