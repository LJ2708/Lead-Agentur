"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatEuro, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Package,
  Phone,
  CreditCard,
  PartyPopper,
  Loader2,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface LeadPaket {
  id: string;
  name: string;
  beschreibung: string | null;
  leads_pro_monat: number;
  preis_pro_lead_cents: number;
  gesamtpreis_cents: number;
  mindestlaufzeit_monate: number;
  setter_aufpreis_cents: number;
  stripe_price_id: string | null;
  is_active: boolean;
}

type Step = 1 | 2 | 3 | 4;

const STEP_META: { step: Step; label: string; icon: React.ElementType }[] = [
  { step: 1, label: "Paketauswahl", icon: Package },
  { step: 2, label: "Setter-Addon", icon: Phone },
  { step: 3, label: "Zusammenfassung", icon: CreditCard },
  { step: 4, label: "Erfolg", icon: PartyPopper },
];

/* -------------------------------------------------------------------------- */
/*  Step indicator                                                            */
/* -------------------------------------------------------------------------- */

function StepIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <nav aria-label="Onboarding Fortschritt" className="mb-10">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {STEP_META.map(({ step, label, icon: Icon }, idx) => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <li key={step} className="flex items-center gap-2 sm:gap-4">
              {idx > 0 && (
                <div
                  className={cn(
                    "hidden h-px w-8 sm:block md:w-16",
                    isCompleted || isActive ? "bg-[#2563EB]" : "bg-gray-200"
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : isActive
                      ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                      : "border-gray-200 bg-white text-gray-400"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive
                      ? "text-[#2563EB]"
                      : isCompleted
                      ? "text-gray-700"
                      : "text-gray-400"
                  )}
                >
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [pakete, setPakete] = useState<LeadPaket[]>([]);
  const [loadingPakete, setLoadingPakete] = useState(true);
  const [selectedPaketId, setSelectedPaketId] = useState<string | null>(null);
  const [hatSetter, setHatSetter] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPaket = pakete.find((p) => p.id === selectedPaketId) ?? null;

  // Fetch active pakete on mount
  useEffect(() => {
    async function fetchPakete() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("lead_pakete")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Pakete konnten nicht geladen werden:", error);
        setError("Pakete konnten nicht geladen werden. Bitte laden Sie die Seite neu.");
      } else {
        setPakete(data ?? []);
      }
      setLoadingPakete(false);
    }
    fetchPakete();
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Demo activation                                                       */
  /* ---------------------------------------------------------------------- */

  const activateDemo = useCallback(async () => {
    if (!selectedPaket) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sie sind nicht angemeldet.");
        setSubmitting(false);
        return;
      }

      // Upsert berater record
      const { error: beraterError } = await supabase.from("berater").upsert(
        {
          profile_id: user.id,
          lead_paket_id: selectedPaket.id,
          status: "aktiv",
          subscription_status: "active",
          hat_setter: hatSetter,
          leads_kontingent: selectedPaket.leads_pro_monat,
          leads_geliefert: 0,
        },
        { onConflict: "profile_id" }
      );

      if (beraterError) {
        console.error("Berater-Datensatz konnte nicht erstellt werden:", beraterError);
        setError("Aktivierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
        setSubmitting(false);
        return;
      }

      setStep(4);
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedPaket, hatSetter]);

  /* ---------------------------------------------------------------------- */
  /*  Helpers                                                                */
  /* ---------------------------------------------------------------------- */

  function gesamtpreisWithSetter(paket: LeadPaket): number {
    if (!hatSetter) return paket.gesamtpreis_cents;
    return paket.gesamtpreis_cents + paket.setter_aufpreis_cents * paket.leads_pro_monat;
  }

  function preisProLeadWithSetter(paket: LeadPaket): number {
    if (!hatSetter) return paket.preis_pro_lead_cents;
    return paket.preis_pro_lead_cents + paket.setter_aufpreis_cents;
  }

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      <StepIndicator currentStep={step} />

      {error && (
        <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Step 1 — Paketauswahl                                            */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Wählen Sie Ihr Lead-Paket
            </h2>
            <p className="mt-2 text-muted-foreground">
              Wählen Sie das Paket, das am besten zu Ihrem Geschäft passt.
            </p>
          </div>

          {loadingPakete ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
            </div>
          ) : pakete.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              Keine Pakete verfügbar. Bitte kontaktieren Sie den Support.
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pakete.map((paket) => {
                  const isSelected = selectedPaketId === paket.id;
                  const isPopular = paket.name.toLowerCase().includes("standard");

                  return (
                    <Card
                      key={paket.id}
                      className={cn(
                        "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
                        isSelected
                          ? "border-[#2563EB] ring-2 ring-[#2563EB] shadow-lg"
                          : "border-gray-200 hover:border-[#2563EB]/40",
                        isPopular && !isSelected && "border-blue-200"
                      )}
                      onClick={() => setSelectedPaketId(paket.id)}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-[#2563EB] text-white hover:bg-[#2563EB] shadow-sm">
                            <Sparkles className="mr-1 h-3 w-3" />
                            Beliebtestes Paket
                          </Badge>
                        </div>
                      )}

                      <CardHeader className={cn("pb-4", isPopular && "pt-8")}>
                        <CardTitle className="text-lg">{paket.name}</CardTitle>
                        {paket.beschreibung && (
                          <CardDescription className="text-sm">
                            {paket.beschreibung}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-3xl font-bold text-gray-900">
                            {formatEuro(paket.gesamtpreis_cents)}
                          </div>
                          <p className="text-sm text-muted-foreground">pro Monat</p>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                            <span>
                              <strong>{paket.leads_pro_monat}</strong> Leads pro Monat
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                            <span>
                              {formatEuro(paket.preis_pro_lead_cents)} pro Lead
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                            <span>
                              {paket.mindestlaufzeit_monate} Monate Mindestlaufzeit
                            </span>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter>
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "w-full",
                            isSelected
                              ? "bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                              : ""
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPaketId(paket.id);
                          }}
                        >
                          {isSelected ? "Ausgewählt" : "Auswählen"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  size="lg"
                  className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                  disabled={!selectedPaketId}
                  onClick={() => setStep(2)}
                >
                  Weiter
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Step 2 — Setter-Addon                                            */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && selectedPaket && (
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Setter-Addon</h2>
            <p className="mt-2 text-muted-foreground">
              Möchten Sie Ihre Leads telefonisch vorqualifizieren lassen?
            </p>
          </div>

          <div className="mx-auto max-w-2xl space-y-6">
            {/* Setter explanation card */}
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="flex gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10">
                  <Phone className="h-6 w-6 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Was ist ein Setter?</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Ein Setter kontaktiert Ihre Leads telefonisch und qualifiziert
                    sie vor, bevor sie an Sie übergeben werden. So erhalten Sie nur
                    Leads, die wirklich interessiert und bereit sind.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Without Setter */}
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200",
                !hatSetter
                  ? "border-[#2563EB] ring-2 ring-[#2563EB] shadow-lg"
                  : "border-gray-200 hover:border-[#2563EB]/40 hover:shadow-md"
              )}
              onClick={() => setHatSetter(false)}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      !hatSetter
                        ? "bg-[#2563EB] text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Ohne Setter</h3>
                    <p className="text-sm text-muted-foreground">
                      Sie erhalten Leads direkt ohne telefonische Vorqualifikation.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatEuro(selectedPaket.gesamtpreis_cents)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatEuro(selectedPaket.preis_pro_lead_cents)} / Lead
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* With Setter */}
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200",
                hatSetter
                  ? "border-[#2563EB] ring-2 ring-[#2563EB] shadow-lg"
                  : "border-gray-200 hover:border-[#2563EB]/40 hover:shadow-md"
              )}
              onClick={() => setHatSetter(true)}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      hatSetter
                        ? "bg-[#2563EB] text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Mit Setter
                      <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                        Empfohlen
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Telefonische Vorqualifikation durch erfahrene Setter.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatEuro(gesamtpreisWithSetter(selectedPaket))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatEuro(preisProLeadWithSetter(selectedPaket))} / Lead
                  </p>
                  {selectedPaket.setter_aufpreis_cents > 0 && (
                    <p className="text-xs text-[#2563EB]">
                      +{formatEuro(selectedPaket.setter_aufpreis_cents)} Aufpreis / Lead
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button
                size="lg"
                className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                onClick={() => setStep(3)}
              >
                Weiter
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Step 3 — Zusammenfassung & Checkout                              */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && selectedPaket && (
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Zusammenfassung</h2>
            <p className="mt-2 text-muted-foreground">
              Überprüfen Sie Ihre Auswahl, bevor Sie fortfahren.
            </p>
          </div>

          <div className="mx-auto max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ihre Bestellung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Paket details */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedPaket.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPaket.leads_pro_monat} Leads / Monat &middot;{" "}
                      {selectedPaket.mindestlaufzeit_monate} Monate Laufzeit
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatEuro(selectedPaket.gesamtpreis_cents)} / Monat
                  </p>
                </div>

                {/* Setter addon */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-semibold text-gray-900">Setter-Addon</p>
                    <p className="text-sm text-muted-foreground">
                      {hatSetter
                        ? "Telefonische Vorqualifikation aktiv"
                        : "Nicht ausgewählt"}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {hatSetter
                      ? `+${formatEuro(
                          selectedPaket.setter_aufpreis_cents *
                            selectedPaket.leads_pro_monat
                        )} / Monat`
                      : "---"}
                  </p>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-lg font-bold text-gray-900">Gesamtpreis</p>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#2563EB]">
                      {formatEuro(gesamtpreisWithSetter(selectedPaket))}
                    </p>
                    <p className="text-sm text-muted-foreground">pro Monat inkl. MwSt.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                disabled={submitting}
                onClick={() => {
                  // Stripe checkout — placeholder for now
                  alert(
                    "Stripe-Checkout ist noch nicht konfiguriert. Nutzen Sie den Demo-Modus."
                  );
                }}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Weiter zur Zahlung
              </Button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <span className="relative bg-white px-4 text-sm text-muted-foreground">
                  oder
                </span>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={submitting}
                onClick={activateDemo}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird aktiviert...
                  </>
                ) : (
                  "Demo-Modus: Paket ohne Zahlung aktivieren"
                )}
              </Button>
            </div>

            <div className="flex justify-start pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Step 4 — Erfolg                                                   */}
      {/* ------------------------------------------------------------------ */}
      {step === 4 && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <PartyPopper className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Willkommen bei LeadSolution!
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Ihr Paket wurde erfolgreich aktiviert. Sie können jetzt Ihr Dashboard
            nutzen und Ihre ersten Leads empfangen.
          </p>

          {selectedPaket && (
            <Card className="mt-8 w-full max-w-sm">
              <CardContent className="p-6 text-left">
                <h3 className="font-semibold text-gray-900">{selectedPaket.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedPaket.leads_pro_monat} Leads / Monat
                  {hatSetter ? " + Setter" : ""}
                </p>
                <p className="mt-2 text-lg font-bold text-[#2563EB]">
                  {formatEuro(gesamtpreisWithSetter(selectedPaket))} / Monat
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            className="mt-8 bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            onClick={() => {
              router.push("/berater");
              router.refresh();
            }}
          >
            Zum Dashboard
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
