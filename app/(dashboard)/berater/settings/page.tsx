"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BeraterForm } from "@/components/forms/BeraterForm";
import {
  User,
  CreditCard,
  Pause,
  Play,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Package,
  Users,
} from "lucide-react";
import { formatEuro, cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Berater = Tables<"berater">;

export default function BeraterSettingsPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [berater, setBerater] = useState<Berater | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    const { data: beraterData } = await supabase
      .from("berater")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    if (beraterData) {
      setBerater(beraterData);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleProfileSave(data: {
    vorname: string;
    nachname: string;
    telefon: string;
  }) {
    if (!profile) return;

    setIsSaving(true);
    setSaveSuccess(false);

    await supabase
      .from("profiles")
      .update({
        full_name: `${data.vorname} ${data.nachname}`.trim(),
        phone: data.telefon || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    await fetchData();
  }

  async function handlePauseToggle() {
    if (!berater) return;

    setIsPausing(true);
    const newStatus = berater.status === "aktiv" ? "pausiert" : "aktiv";

    await supabase
      .from("berater")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", berater.id);

    setIsPausing(false);
    setShowPauseDialog(false);
    await fetchData();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!profile || !berater) return null;

  const isPausiert = berater.status === "pausiert";
  const subscriptionLabel = getSubscriptionLabel(
    berater.subscription_status ?? ""
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihr Profil und Ihre Abonnement-Einstellungen
        </p>
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Profil</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">E-Mail:</span>{" "}
            <span className="font-medium">{profile.email}</span>
          </div>

          <BeraterForm
            initialData={{
              vorname: ((profile as any).full_name ?? "").split(" ")[0] ?? "",
              nachname: ((profile as any).full_name ?? "").split(" ").slice(1).join(" "),
              telefon: (profile as any).phone ?? "",
            }}
            onSubmit={handleProfileSave}
            isLoading={isSaving}
          />

          {saveSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Profil erfolgreich gespeichert
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription & Package */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Abonnement</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Abonnement-Status
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    subscriptionLabel.color
                  )}
                >
                  {subscriptionLabel.label}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lead-Kontingent</p>
              <p className="mt-1 text-lg font-semibold">
                {berater.leads_geliefert} /{" "}
                {berater.leads_kontingent} Leads
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Berater-Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    isPausiert
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {isPausiert ? "Pausiert" : "Aktiv"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leads gesamt</p>
              <p className="mt-1 font-medium">{berater.leads_gesamt}</p>
            </div>
          </div>

          <Separator />

          {/* Pause/Unpause */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {isPausiert
                  ? "Lead-Zustellung fortsetzen"
                  : "Lead-Zustellung pausieren"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isPausiert
                  ? "Neue Leads werden wieder zugestellt"
                  : "Keine neuen Leads während der Pause"}
              </p>
            </div>
            <Button
              variant={isPausiert ? "default" : "outline"}
              onClick={() => setShowPauseDialog(true)}
            >
              {isPausiert ? (
                <Play className="h-4 w-4" data-icon="inline-start" />
              ) : (
                <Pause className="h-4 w-4" data-icon="inline-start" />
              )}
              {isPausiert ? "Fortsetzen" : "Pausieren"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setter Info */}
      {berater.assigned_setter_id && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Teamleiter</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ihr Teamleiter verwaltet die Lead-Zuweisung und
              Qualitätskontrolle.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pause Confirmation Dialog */}
      <Dialog
        open={showPauseDialog}
        onOpenChange={(open) => !open && setShowPauseDialog(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isPausiert ? (
                <Play className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              {isPausiert
                ? "Lead-Zustellung fortsetzen?"
                : "Lead-Zustellung pausieren?"}
            </DialogTitle>
            <DialogDescription>
              {isPausiert
                ? "Sie erhalten wieder neue Leads gemäß Ihrem Kontingent."
                : "Während der Pause werden Ihnen keine neuen Leads zugewiesen. Bestehende Leads bleiben erhalten."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPauseDialog(false)}
              disabled={isPausing}
            >
              Abbrechen
            </Button>
            <Button
              variant={isPausiert ? "default" : "destructive"}
              onClick={handlePauseToggle}
              disabled={isPausing}
            >
              {isPausing && (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              {isPausiert ? "Fortsetzen" : "Pausieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getSubscriptionLabel(status: string): {
  label: string;
  color: string;
} {
  switch (status) {
    case "active":
      return { label: "Aktiv", color: "bg-emerald-100 text-emerald-800" };
    case "trialing":
      return { label: "Testphase", color: "bg-blue-100 text-blue-800" };
    case "past_due":
      return {
        label: "Zahlung ausstehend",
        color: "bg-yellow-100 text-yellow-800",
      };
    case "canceled":
      return { label: "Gekündigt", color: "bg-red-100 text-red-800" };
    case "incomplete":
      return {
        label: "Unvollständig",
        color: "bg-orange-100 text-orange-800",
      };
    default:
      return { label: "Unbekannt", color: "bg-gray-100 text-gray-800" };
  }
}
