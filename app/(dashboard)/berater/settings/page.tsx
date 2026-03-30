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
import { toast } from "sonner";
import { BeraterForm } from "@/components/forms/BeraterForm";
import {
  User,
  Pause,
  Play,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Package,
  Users,
} from "lucide-react";
import { WorkingHoursEditor } from "@/components/dashboard/WorkingHoursEditor";
import { AvailabilityToggle } from "@/components/dashboard/AvailabilityToggle";
import { cn } from "@/lib/utils";
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

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
              vorname: (profile.full_name ?? "").split(" ")[0] ?? "",
              nachname: (profile.full_name ?? "").split(" ").slice(1).join(" "),
              telefon: profile.phone ?? "",
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Leads pro Monat</p>
              <p className="mt-1 font-medium">{berater.leads_pro_monat}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Preis pro Lead</p>
              <p className="mt-1 font-medium">
                {(berater.preis_pro_lead_cents / 100).toFixed(2)} €
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Setter-Typ</p>
              <p className="mt-1 font-medium">
                {berater.setter_typ === "pool"
                  ? "LeadSolution Setter"
                  : berater.setter_typ === "eigen"
                  ? "Eigener Setter"
                  : "Kein Setter"}
              </p>
            </div>
          </div>

          {/* Setter Addon */}
          <Separator />
          <SetterAddonSection berater={berater} onUpdate={(updated) => setBerater({ ...berater, ...updated })} />

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

      {/* Arbeitszeiten & Verfuegbarkeit */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Arbeitszeiten & Verfügbarkeit</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              Aktueller Status
            </h3>
            <AvailabilityToggle beraterId={berater.id} />
          </div>
          <Separator />
          <div>
            <WorkingHoursEditor beraterId={berater.id} />
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SetterAddonSection({ berater, onUpdate }: { berater: any; onUpdate: (data: Record<string, unknown>) => void }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<"add" | "remove">("add")

  const isActive = berater.setter_typ === "pool"
  const preisProLead = berater.preis_pro_lead_cents / 100
  const setterAufpreis = 10
  const leadsProMonat = berater.leads_pro_monat
  const currentMonthly = leadsProMonat * preisProLead
  const newMonthly = isActive
    ? leadsProMonat * preisProLead // removing setter
    : leadsProMonat * (preisProLead + setterAufpreis) // adding setter
  const diff = isActive ? -(leadsProMonat * setterAufpreis) : leadsProMonat * setterAufpreis

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/update-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action === "add" ? "add_setter" : "remove_setter" }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onUpdate({ setter_typ: data.setter_typ })
        toast.success(
          action === "add"
            ? "Setter-Service aktiviert! Dein Abo wurde aktualisiert."
            : "Setter-Service deaktiviert. Dein Abo wurde aktualisiert."
        )
      } else {
        toast.error(data.error || "Fehler beim Aktualisieren")
      }
    } catch {
      toast.error("Verbindungsfehler. Bitte erneut versuchen.")
    }
    setLoading(false)
    setShowConfirm(false)
  }

  return (
    <>
      <div className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-medium">Setter-Service</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Ein Setter kontaktiert deine Leads telefonisch, qualifiziert sie und vereinbart Termine — bevor sie an dich übergeben werden.
            </p>
            {isActive ? (
              <div className="mt-2 rounded-md bg-green-50 dark:bg-green-950/30 p-2.5">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✓ Aktiv — +{setterAufpreis}€ pro Lead ({(leadsProMonat * setterAufpreis).toFixed(0)}€/Monat)
                </p>
              </div>
            ) : (
              <div className="mt-2 rounded-md bg-purple-50 dark:bg-purple-950/30 p-2.5">
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  +{setterAufpreis}€ pro Lead · {leadsProMonat} Leads = <span className="font-medium">+{(leadsProMonat * setterAufpreis).toFixed(0)}€/Monat</span>
                </p>
              </div>
            )}
          </div>
          <div className="shrink-0 pt-1">
            {isActive ? (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { setAction("remove"); setShowConfirm(true) }}
              >
                Deaktivieren
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => { setAction("add"); setShowConfirm(true) }}
              >
                Setter hinzubuchen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "add" ? "Setter-Service hinzubuchen" : "Setter-Service deaktivieren"}
            </DialogTitle>
            <DialogDescription>
              {action === "add"
                ? "Der Setter-Service wird ab sofort aktiviert. Deine monatliche Rechnung wird entsprechend angepasst."
                : "Der Setter-Service wird deaktiviert. Deine monatliche Rechnung wird reduziert."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aktuell</span>
                <span className="font-medium">{currentMonthly.toFixed(0)}€/Monat</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {action === "add" ? "+ Setter-Service" : "– Setter-Service"}
                </span>
                <span className={action === "add" ? "text-purple-600 font-medium" : "text-green-600 font-medium"}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(0)}€/Monat
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Neuer Preis</span>
                <span>{newMonthly.toFixed(0)}€/Monat</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {action === "add"
                ? "Der anteilige Betrag für den Rest des Monats wird sofort berechnet."
                : "Die Gutschrift wird mit deiner nächsten Rechnung verrechnet."}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={action === "add" ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {loading ? "Wird aktualisiert..." : action === "add" ? "Kostenpflichtig buchen" : "Deaktivieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
