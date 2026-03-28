"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatEuro, cn } from "@/lib/utils"
import {
  calcGesamtpreis,
  calcPreisProLead,
  formatPreis,
  MIN_LEADS,
  MAX_LEADS,
  SETTER_AUFPREIS,
  MINDESTLAUFZEIT,
} from "@/lib/pricing/calculator"
import type { PricingResult } from "@/lib/pricing/calculator"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Phone,
  Clock,
  CreditCard,
  PartyPopper,
  Loader2,
  Zap,
  Building2,
  Users,
  UserCheck,
} from "lucide-react"
import { WorkingHoursEditor } from "@/components/dashboard/WorkingHoursEditor"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Step = 1 | 2 | 3 | 4 | 5
type SetterTyp = "pool" | "eigen" | "keiner"

const STEP_META: { step: Step; label: string; icon: React.ElementType }[] = [
  { step: 1, label: "Lead-Anzahl", icon: SlidersHorizontal },
  { step: 2, label: "Setter-Addon", icon: Phone },
  { step: 3, label: "Arbeitszeiten", icon: Clock },
  { step: 4, label: "Zusammenfassung", icon: CreditCard },
  { step: 5, label: "Erfolg", icon: PartyPopper },
]

/* -------------------------------------------------------------------------- */
/*  Step indicator                                                            */
/* -------------------------------------------------------------------------- */

function StepIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <nav aria-label="Onboarding Fortschritt" className="mb-10">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {STEP_META.map(({ step, label, icon: Icon }, idx) => {
          const isActive = step === currentStep
          const isCompleted = step < currentStep
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
          )
        })}
      </ol>
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  // Step 1 state
  const [leadsCount, setLeadsCount] = useState(10)
  const [pricing, setPricing] = useState<PricingResult>(() =>
    calcGesamtpreis(10, false)
  )

  // Step 2 state
  const [setterTyp, setSetterTyp] = useState<SetterTyp>("keiner")
  const hatSetter = setterTyp !== "keiner"

  // Step 3 state
  const [beraterId, setBeraterId] = useState<string | null>(null)
  const [workingHoursSaved, setWorkingHoursSaved] = useState(false)

  // General state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recalculate pricing when leads or setter changes
  useEffect(() => {
    setPricing(calcGesamtpreis(leadsCount, hatSetter))
  }, [leadsCount, hatSetter])

  // Try to fetch existing berater ID on mount
  useEffect(() => {
    async function fetchBeraterId() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: beraterData } = await supabase
          .from("berater")
          .select("id")
          .eq("profile_id", user.id)
          .single()
        if (beraterData) {
          setBeraterId(beraterData.id)
        }
      }
    }
    fetchBeraterId()
  }, [])

  /* ---------------------------------------------------------------------- */
  /*  Demo activation                                                       */
  /* ---------------------------------------------------------------------- */

  const activateDemo = useCallback(async () => {
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Sie sind nicht angemeldet.")
        setSubmitting(false)
        return
      }

      const preisProLeadCents = calcPreisProLead(leadsCount) * 100

      // Upsert berater record with flexible pricing fields
      const { error: beraterError } = await supabase.from("berater").upsert(
        {
          profile_id: user.id,
          status: "aktiv" as const,
          subscription_status: "active" as const,
          hat_setter: hatSetter,
          setter_typ: setterTyp,
          leads_kontingent: leadsCount,
          leads_geliefert: 0,
          leads_pro_monat: leadsCount,
          preis_pro_lead_cents: preisProLeadCents,
        },
        { onConflict: "profile_id" }
      )

      if (beraterError) {
        console.error(
          "Berater-Datensatz konnte nicht erstellt werden:",
          beraterError
        )
        setError(
          "Aktivierung fehlgeschlagen. Bitte versuchen Sie es erneut."
        )
        setSubmitting(false)
        return
      }

      // Fetch the berater ID for working hours
      const { data: beraterData } = await supabase
        .from("berater")
        .select("id")
        .eq("profile_id", user.id)
        .single()

      if (beraterData) {
        setBeraterId(beraterData.id)
      }

      setStep(5)
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setSubmitting(false)
    }
  }, [leadsCount, hatSetter, setterTyp])

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
      {/*  Step 1 — Lead-Anzahl waehlen                                      */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Lead-Anzahl wählen
            </h2>
            <p className="mt-2 text-muted-foreground">
              Wählen Sie, wie viele Leads Sie pro Monat erhalten möchten.
              Je mehr Leads, desto günstiger der Preis pro Lead.
            </p>
          </div>

          <div className="mx-auto max-w-2xl space-y-8">
            {/* Slider */}
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {MIN_LEADS} Leads
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {MAX_LEADS} Leads
                  </span>
                </div>

                <Slider
                  value={[leadsCount]}
                  onValueChange={(value) => setLeadsCount(value[0])}
                  min={MIN_LEADS}
                  max={MAX_LEADS}
                  step={5}
                />

                {/* Live price display */}
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-6 text-center">
                  <div className="text-4xl font-bold text-gray-900">
                    {leadsCount}{" "}
                    <span className="text-lg font-normal text-muted-foreground">
                      Leads
                    </span>
                  </div>
                  <div className="mt-3 text-lg text-gray-700">
                    {leadsCount} Leads &times;{" "}
                    {formatPreis(pricing.preisProLead)} ={" "}
                    <span className="font-bold text-[#2563EB]">
                      {formatPreis(pricing.monatspreis)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      / Monat
                    </span>
                  </div>
                  {pricing.ersparnis > 0 && (
                    <div className="mt-2 text-sm text-green-600">
                      Sie sparen {formatPreis(pricing.ersparnis)} / Monat
                      gegenüber dem Einzelpreis
                    </div>
                  )}
                </div>

                {/* Tick marks */}
                <div className="flex justify-between px-1 text-xs text-muted-foreground">
                  {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLeadsCount(val)}
                      className={cn(
                        "rounded px-1 py-0.5 transition-colors hover:bg-gray-100",
                        val === leadsCount && "font-bold text-[#2563EB]"
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enterprise banner at 50 leads */}
            {pricing.isEnterprise && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Building2 className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Enterprise-Angebot
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Bei 50+ Leads erstellen wir Ihnen gerne ein individuelles
                      Angebot mit noch besseren Konditionen.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary facts */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPreis(pricing.preisProLead)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">pro Lead</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-[#2563EB]">
                  {formatPreis(pricing.monatspreis)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">pro Monat</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {MINDESTLAUFZEIT}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Monate Mindestlaufzeit
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                onClick={() => setStep(2)}
              >
                Weiter
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Step 2 — Setter-Addon                                            */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
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
                  <h3 className="font-semibold text-gray-900">
                    Was ist ein Setter?
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Ein Setter kontaktiert Ihre Leads telefonisch und
                    qualifiziert sie vor, bevor sie an Sie übergeben werden. So
                    erhalten Sie nur Leads, die wirklich interessiert und bereit
                    sind.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Without Setter */}
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200",
                setterTyp === "keiner"
                  ? "border-[#2563EB] ring-2 ring-[#2563EB] shadow-lg"
                  : "border-gray-200 hover:border-[#2563EB]/40 hover:shadow-md"
              )}
              onClick={() => setSetterTyp("keiner")}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      setterTyp === "keiner"
                        ? "bg-[#2563EB] text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Ohne Setter</h3>
                    <p className="text-sm text-muted-foreground">
                      Sie erhalten Leads direkt ohne telefonische
                      Vorqualifikation.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatPreis(
                      calcGesamtpreis(leadsCount, false).monatspreis
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPreis(
                      calcGesamtpreis(leadsCount, false).preisProLead
                    )}{" "}
                    / Lead
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* With LeadSolution Setter (Pool) */}
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200",
                setterTyp === "pool"
                  ? "border-[#2563EB] ring-2 ring-[#2563EB] shadow-lg"
                  : "border-gray-200 hover:border-[#2563EB]/40 hover:shadow-md"
              )}
              onClick={() => setSetterTyp("pool")}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      setterTyp === "pool"
                        ? "bg-[#2563EB] text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      LeadSolution Setter
                      <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                        Empfohlen
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Unser erfahrenes Setter-Team qualifiziert Ihre Leads vor.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatPreis(
                      calcGesamtpreis(leadsCount, true).monatspreis
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPreis(
                      calcGesamtpreis(leadsCount, true).gesamtProLead
                    )}{" "}
                    / Lead
                  </p>
                  <p className="text-xs text-[#2563EB]">
                    +{formatEuro(SETTER_AUFPREIS * 100)} Aufpreis / Lead
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* With own Setter */}
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200",
                setterTyp === "eigen"
                  ? "border-[#2563EB] ring-2 ring-[#2563EB] shadow-lg"
                  : "border-gray-200 hover:border-[#2563EB]/40 hover:shadow-md"
              )}
              onClick={() => setSetterTyp("eigen")}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      setterTyp === "eigen"
                        ? "bg-[#2563EB] text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Eigener Setter
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Nutzen Sie Ihren eigenen Setter für die
                      Vorqualifikation.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatPreis(
                      calcGesamtpreis(leadsCount, true).monatspreis
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPreis(
                      calcGesamtpreis(leadsCount, true).gesamtProLead
                    )}{" "}
                    / Lead
                  </p>
                  <p className="text-xs text-[#2563EB]">
                    +{formatEuro(SETTER_AUFPREIS * 100)} Aufpreis / Lead
                  </p>
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
      {/*  Step 3 — Arbeitszeiten                                           */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Arbeitszeiten festlegen
            </h2>
            <p className="mt-2 text-muted-foreground">
              Legen Sie fest, wann Sie für neue Leads erreichbar sind.
              Außerhalb dieser Zeiten werden keine Leads zugewiesen.
            </p>
          </div>

          <div className="mx-auto max-w-2xl space-y-6">
            {beraterId ? (
              <WorkingHoursEditor
                beraterId={beraterId}
                onSave={() => setWorkingHoursSaved(true)}
              />
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Arbeitszeiten werden nach der Paketaktivierung gespeichert.
                  Sie können die Standardzeiten (Mo-Fr 09:00-18:00) später
                  anpassen.
                </p>
                <Button
                  className="mt-4 bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                  onClick={() => {
                    setWorkingHoursSaved(true)
                  }}
                >
                  Mit Standardzeiten fortfahren
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button
                size="lg"
                className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                disabled={!workingHoursSaved && !!beraterId}
                onClick={() => setStep(4)}
              >
                Weiter
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Step 4 — Zusammenfassung & Checkout                              */}
      {/* ------------------------------------------------------------------ */}
      {step === 4 && (
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Zusammenfassung
            </h2>
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
                {/* Lead details */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {leadsCount} Leads pro Monat
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPreis(pricing.preisProLead)} pro Lead &middot;{" "}
                      {MINDESTLAUFZEIT} Monate Laufzeit
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatPreis(
                      calcGesamtpreis(leadsCount, false).monatspreis
                    )}{" "}
                    / Monat
                  </p>
                </div>

                {/* Setter addon */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-semibold text-gray-900">Setter-Addon</p>
                    <p className="text-sm text-muted-foreground">
                      {setterTyp === "keiner"
                        ? "Nicht ausgewählt"
                        : setterTyp === "pool"
                        ? "LeadSolution Setter"
                        : "Eigener Setter"}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {hatSetter
                      ? `+${formatPreis(pricing.setterProLead * leadsCount)} / Monat`
                      : "\u2014"}
                  </p>
                </div>

                {/* Savings */}
                {pricing.ersparnis > 0 && (
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <p className="font-semibold text-green-600">
                        Ihre Ersparnis
                      </p>
                      <p className="text-sm text-muted-foreground">
                        gegenüber dem Einzelpreis von{" "}
                        {formatPreis(5900)} pro Lead
                      </p>
                    </div>
                    <p className="font-semibold text-green-600">
                      -{formatPreis(pricing.ersparnis)} / Monat
                    </p>
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-lg font-bold text-gray-900">Gesamtpreis</p>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#2563EB]">
                      {formatPreis(pricing.monatspreis)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      pro Monat inkl. MwSt.
                    </p>
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
                onClick={async () => {
                  setSubmitting(true)
                  setError(null)

                  try {
                    // Ensure we have a berater record
                    const supabase = createClient()
                    const {
                      data: { user: currentUser },
                    } = await supabase.auth.getUser()

                    if (!currentUser) {
                      setError("Sie sind nicht angemeldet.")
                      setSubmitting(false)
                      return
                    }

                    // Upsert berater so the checkout route can find it
                    const preisProLeadCents = calcPreisProLead(leadsCount) * 100
                    await supabase.from("berater").upsert(
                      {
                        profile_id: currentUser.id,
                        status: "pending" as const,
                        leads_pro_monat: leadsCount,
                        preis_pro_lead_cents: preisProLeadCents,
                        setter_typ: setterTyp,
                        hat_setter: hatSetter,
                      },
                      { onConflict: "profile_id" }
                    )

                    const res = await fetch("/api/stripe/checkout", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        leads_pro_monat: leadsCount,
                        hat_setter: setterTyp === "pool",
                      }),
                    })

                    const data = await res.json()

                    if (!res.ok) {
                      setError(
                        data.error ||
                          "Stripe noch nicht konfiguriert. Bitte nutzen Sie den Demo-Modus."
                      )
                      setSubmitting(false)
                      return
                    }

                    if (data.url) {
                      window.location.href = data.url
                    } else {
                      setError("Stripe noch nicht konfiguriert")
                      setSubmitting(false)
                    }
                  } catch {
                    setError(
                      "Stripe noch nicht konfiguriert. Bitte nutzen Sie den Demo-Modus."
                    )
                    setSubmitting(false)
                  }
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird weitergeleitet...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Weiter zur Zahlung
                  </>
                )}
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
              <Button variant="ghost" onClick={() => setStep(3)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Step 5 — Erfolg                                                   */}
      {/* ------------------------------------------------------------------ */}
      {step === 5 && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <PartyPopper className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Willkommen bei LeadSolution!
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Ihr Paket wurde erfolgreich aktiviert. Sie können jetzt Ihr
            Dashboard nutzen und Ihre ersten Leads empfangen.
          </p>

          <Card className="mt-8 w-full max-w-sm">
            <CardContent className="p-6 text-left">
              <h3 className="font-semibold text-gray-900">
                {leadsCount} Leads / Monat
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPreis(pricing.preisProLead)} pro Lead
                {hatSetter
                  ? ` + ${formatEuro(SETTER_AUFPREIS * 100)} Setter`
                  : ""}
              </p>
              <p className="mt-2 text-lg font-bold text-[#2563EB]">
                {formatPreis(pricing.monatspreis)} / Monat
              </p>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="mt-8 bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            onClick={() => {
              router.push("/berater")
              router.refresh()
            }}
          >
            Zum Dashboard
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  )
}
