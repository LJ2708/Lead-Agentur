"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEuro, formatDate } from "@/lib/utils";
import { SETTER_AUFPREIS, SETTER_VERGUETUNG } from "@/lib/pricing/calculator";
import {
  Headphones,
  Users,
  PhoneCall,
  TrendingUp,
  Wallet,
  Loader2,
  UserPlus,
  CheckCircle,
  Clock,
  Settings,
} from "lucide-react";

interface SetterProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface SetterStats {
  profile: SetterProfile;
  leadsZugewiesen: number;
  leadsBearbeitetMonat: number;
  kontaktversucheGesamt: number;
  verguetungMonat: number;
  isActive: boolean;
}

interface Abrechnung {
  id: string;
  setter_id: string;
  setter_name: string;
  monat: string;
  leads_bearbeitet: number;
  gesamt_cents: number;
  ausgezahlt: boolean;
  ausgezahlt_am: string | null;
}

export default function AdminSetterPage() {
  const supabase = createClient();

  const [setterList, setSetterList] = useState<SetterStats[]>([]);
  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("alle");
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Config state
  const [maxKontaktversuche, setMaxKontaktversuche] = useState("5");
  const [setterVerguetung, setSetterVerguetung] = useState(
    String(SETTER_VERGUETUNG)
  );
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Fetch setter profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("role", "setter");

    const setters = profiles ?? [];

    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();

    // Build stats for each setter
    const stats: SetterStats[] = [];

    for (const p of setters) {
      // Count leads assigned to this setter
      const { count: leadsZugewiesen } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("setter_id", p.id);

      // Count leads where status changed this month (setter worked on)
      const { data: leadsThisMonth } = await supabase
        .from("leads")
        .select("id, kontaktversuche")
        .eq("setter_id", p.id)
        .gte("updated_at", monthStart);

      const leadsBearbeitetMonat = leadsThisMonth?.length ?? 0;

      // Sum kontaktversuche
      const { data: allLeads } = await supabase
        .from("leads")
        .select("kontaktversuche")
        .eq("setter_id", p.id);

      const kontaktversucheGesamt = (allLeads ?? []).reduce(
        (sum, l) => sum + (l.kontaktversuche ?? 0),
        0
      );

      // Verguetung this month: leads_bearbeitet * 8 EUR
      const verguetungMonat = leadsBearbeitetMonat * SETTER_VERGUETUNG * 100;

      // Check if active: has assigned leads that are not abschluss/verloren
      const { count: activeLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("setter_id", p.id)
        .not("status", "in", '("abschluss","verloren")');

      stats.push({
        profile: p as SetterProfile,
        leadsZugewiesen: leadsZugewiesen ?? 0,
        leadsBearbeitetMonat,
        kontaktversucheGesamt,
        verguetungMonat,
        isActive: (activeLeads ?? 0) > 0,
      });
    }

    setSetterList(stats);

    // Fetch abrechnungen with setter names
    const { data: abrData } = await supabase
      .from("setter_abrechnungen")
      .select("*, profiles:setter_id(full_name)")
      .order("monat", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedAbr: Abrechnung[] = (abrData ?? []).map((a: any) => ({
      id: a.id,
      setter_id: a.setter_id,
      setter_name: a.profiles?.full_name ?? "Unbekannt",
      monat: a.monat,
      leads_bearbeitet: a.leads_bearbeitet,
      gesamt_cents: a.gesamt_cents,
      ausgezahlt: a.ausgezahlt,
      ausgezahlt_am: a.ausgezahlt_am,
    }));

    setAbrechnungen(enrichedAbr);

    // Fetch config
    const { data: configData } = await supabase
      .from("pricing_config")
      .select("key, value")
      .in("key", ["max_kontaktversuche", "setter_verguetung_cents"]);

    for (const c of configData ?? []) {
      if (c.key === "max_kontaktversuche") {
        setMaxKontaktversuche(String(c.value));
      }
      if (c.key === "setter_verguetung_cents") {
        setSetterVerguetung(String(c.value / 100));
      }
    }

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleMarkAusgezahlt(abrechnungId: string) {
    setMarkingId(abrechnungId);
    await supabase
      .from("setter_abrechnungen")
      .update({
        ausgezahlt: true,
        ausgezahlt_am: new Date().toISOString(),
      })
      .eq("id", abrechnungId);
    setMarkingId(null);
    await fetchData();
  }

  async function handleSaveConfig() {
    setSavingConfig(true);

    const maxVal = parseInt(maxKontaktversuche, 10);
    const vergVal = parseFloat(setterVerguetung);

    if (!isNaN(maxVal)) {
      await supabase
        .from("pricing_config")
        .upsert(
          {
            key: "max_kontaktversuche",
            value: maxVal,
            label: "Max Kontaktversuche pro Lead",
          },
          { onConflict: "key" }
        );
    }

    if (!isNaN(vergVal)) {
      await supabase
        .from("pricing_config")
        .upsert(
          {
            key: "setter_verguetung_cents",
            value: Math.round(vergVal * 100),
            label: "Setter-Vergütung pro Lead (Cents)",
          },
          { onConflict: "key" }
        );
    }

    setSavingConfig(false);
    await fetchData();
  }

  // Computed stats
  const aktiveSetter = setterList.filter((s) => s.isActive).length;
  const leadsInBearbeitung = setterList.reduce(
    (sum, s) => sum + s.leadsZugewiesen,
    0
  );
  const avgKontaktversuche =
    leadsInBearbeitung > 0
      ? (
          setterList.reduce((sum, s) => sum + s.kontaktversucheGesamt, 0) /
          leadsInBearbeitung
        ).toFixed(1)
      : "0";
  const verguetungMonat = setterList.reduce(
    (sum, s) => sum + s.verguetungMonat,
    0
  );
  const leadsBearbeitetGesamt = setterList.reduce(
    (sum, s) => sum + s.leadsBearbeitetMonat,
    0
  );
  const margeMonat = leadsBearbeitetGesamt * (SETTER_AUFPREIS - SETTER_VERGUETUNG) * 100;

  // Month filter for abrechnungen
  const uniqueMonths = Array.from(
    new Set(abrechnungen.map((a) => a.monat))
  ).sort((a, b) => b.localeCompare(a));

  const filteredAbrechnungen =
    filterMonth === "alle"
      ? abrechnungen
      : abrechnungen.filter((a) => a.monat === filterMonth);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Headphones className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Setter-Verwaltung
            </h1>
            <p className="text-sm text-muted-foreground">
              {aktiveSetter} aktive Setter &bull; {leadsInBearbeitung} Leads
              zugewiesen
            </p>
          </div>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Setter hinzufügen
        </Button>
      </div>

      {/* Setter-Statistiken */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{aktiveSetter}</p>
              <p className="text-xs text-muted-foreground">Aktive Setter</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <Headphones className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leadsInBearbeitung}</p>
              <p className="text-xs text-muted-foreground">
                Leads in Bearbeitung
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <PhoneCall className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgKontaktversuche}</p>
              <p className="text-xs text-muted-foreground">
                Ø Kontaktversuche
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <Wallet className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatEuro(verguetungMonat)}
              </p>
              <p className="text-xs text-muted-foreground">
                Vergütung diesen Monat
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatEuro(margeMonat)}</p>
              <p className="text-xs text-muted-foreground">
                Marge diesen Monat
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Setters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktive Setter</CardTitle>
        </CardHeader>
        <CardContent>
          {setterList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Keine Setter vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">E-Mail</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Leads zugewiesen
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Bearbeitet (Monat)
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Kontaktversuche
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Vergütung (Monat)
                    </th>
                    <th className="pb-2 font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {setterList.map((s) => (
                    <tr key={s.profile.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {s.profile.full_name}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {s.profile.email}
                      </td>
                      <td className="py-3 pr-4">
                        {s.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inaktiv</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {s.leadsZugewiesen}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {s.leadsBearbeitetMonat}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {s.kontaktversucheGesamt}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatEuro(s.verguetungMonat)}
                      </td>
                      <td className="py-3">
                        <Button variant="outline" size="sm">
                          Deaktivieren
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setter-Abrechnungen */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Setter-Abrechnungen</CardTitle>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Monat filtern..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Monate</SelectItem>
                {uniqueMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAbrechnungen.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Keine Abrechnungen vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Monat</th>
                    <th className="pb-2 pr-4 font-medium">Setter</th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Leads bearbeitet
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Vergütung
                    </th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbrechnungen.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{a.monat}</td>
                      <td className="py-3 pr-4 font-medium">
                        {a.setter_name}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {a.leads_bearbeitet}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatEuro(a.gesamt_cents)}
                      </td>
                      <td className="py-3 pr-4">
                        {a.ausgezahlt ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Ausgezahlt
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            Offen
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        {!a.ausgezahlt && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={markingId === a.id}
                            onClick={() => handleMarkAusgezahlt(a.id)}
                          >
                            {markingId === a.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : null}
                            Als ausgezahlt markieren
                          </Button>
                        )}
                        {a.ausgezahlt && a.ausgezahlt_am && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(a.ausgezahlt_am)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Setter-Konfiguration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-kontakt">
                Max Kontaktversuche pro Lead
              </Label>
              <Input
                id="max-kontakt"
                type="number"
                min={1}
                max={20}
                value={maxKontaktversuche}
                onChange={(e) => setMaxKontaktversuche(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Standardwert: 5 Versuche
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setter-verg">
                Setter-Vergütung pro Lead (EUR)
              </Label>
              <Input
                id="setter-verg"
                type="number"
                min={0}
                step={0.5}
                value={setterVerguetung}
                onChange={(e) => setSetterVerguetung(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Standardwert: {SETTER_VERGUETUNG} EUR
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <Button onClick={handleSaveConfig} disabled={savingConfig}>
            {savingConfig && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Konfiguration speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
