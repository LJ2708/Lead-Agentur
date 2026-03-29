"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  HelpCircle,
  CheckCircle2,
  Circle,
  Keyboard,
  MessageCircleQuestion,
  Mail,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingStep {
  label: string
  key: "account" | "paket" | "kontakt" | "termin" | "abschluss"
}

interface FaqItem {
  question: string
  answer: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ONBOARDING_STEPS: OnboardingStep[] = [
  { label: "Account erstellt", key: "account" },
  { label: "Paket gew\u00e4hlt", key: "paket" },
  { label: "Ersten Lead kontaktiert", key: "kontakt" },
  { label: "Ersten Termin gebucht", key: "termin" },
  { label: "Ersten Abschluss erzielt", key: "abschluss" },
]

const KEYBOARD_SHORTCUTS = [
  { keys: "\u2318K", description: "Suche \u00f6ffnen" },
  { keys: "\u2318N", description: "Neuer Lead (Admin)" },
]

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Wie weise ich einem Berater neue Leads zu?",
    answer:
      "Gehen Sie zu Admin > Routing und konfigurieren Sie die automatische Verteilung. Alternativ k\u00f6nnen Sie Leads manuell \u00fcber die Lead-Detail-Seite zuweisen.",
  },
  {
    question: "Was passiert, wenn das Kontingent aufgebraucht ist?",
    answer:
      "Neue Leads werden in die Warteschlange gestellt. Der Berater kann \u00fcber den Nachkauf-Bereich weitere Leads erwerben.",
  },
  {
    question: "Wie funktioniert das SLA-System?",
    answer:
      "Nach der Zuweisung hat der Berater eine festgelegte Zeit, den Lead zu kontaktieren. Die SLA-Frist wird in der Lead-\u00dcbersicht angezeigt.",
  },
  {
    question: "Kann ich mein Paket \u00e4ndern?",
    answer:
      "Ja, kontaktieren Sie den Admin oder wechseln Sie \u00fcber Einstellungen > Paket. \u00c4nderungen greifen zum n\u00e4chsten Abrechnungszeitraum.",
  },
  {
    question: "Wie exportiere ich meine Berichte?",
    answer:
      'Gehen Sie zu Reports und klicken Sie auf "Bericht exportieren". Sie k\u00f6nnen zwischen CSV-Export und Druckansicht w\u00e4hlen.',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HelpCenterProps {
  userId?: string
}

export function HelpCenter({ userId }: HelpCenterProps) {
  const [open, setOpen] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Calculate onboarding progress from actual data
  useEffect(() => {
    if (!userId || !open) return

    const currentUserId = userId

    async function checkProgress() {
      const completed = new Set<string>()

      // Account is always created if user is logged in
      completed.add("account")

      // Check if berater has a paket
      const { data: berater } = await supabase
        .from("berater")
        .select("id, lead_paket_id")
        .eq("profile_id", currentUserId)
        .single()

      if (berater?.lead_paket_id) {
        completed.add("paket")
      }

      if (berater) {
        // Check if berater has contacted any lead
        const { data: contactedLeads } = await supabase
          .from("leads")
          .select("id")
          .eq("berater_id", berater.id)
          .not("status", "in", '("neu","zugewiesen","warteschlange")')
          .limit(1)

        if (contactedLeads && contactedLeads.length > 0) {
          completed.add("kontakt")
        }

        // Check for any termine
        const { data: termine } = await supabase
          .from("termine")
          .select("id")
          .eq("berater_id", berater.id)
          .limit(1)

        if (termine && termine.length > 0) {
          completed.add("termin")
        }

        // Check for any abschluss
        const { data: abschluss } = await supabase
          .from("leads")
          .select("id")
          .eq("berater_id", berater.id)
          .eq("status", "abschluss")
          .limit(1)

        if (abschluss && abschluss.length > 0) {
          completed.add("abschluss")
        }
      }

      setCompletedSteps(completed)
    }

    checkProgress()
  }, [userId, open, supabase])

  const completedCount = completedSteps.size
  const totalSteps = ONBOARDING_STEPS.length
  const progressPercent = Math.round((completedCount / totalSteps) * 100)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Hilfe \u00f6ffnen">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Hilfe &amp; Erste Schritte</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Onboarding Checklist */}
          <section>
            <h3 className="mb-3 text-sm font-semibold">Erste Schritte</h3>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalSteps}
              </span>
            </div>
            <ul className="space-y-2">
              {ONBOARDING_STEPS.map((step) => {
                const done = completedSteps.has(step.key)
                return (
                  <li
                    key={step.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        done && "text-muted-foreground line-through"
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <Separator />

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Keyboard className="h-4 w-4" />
              Tastenkürzel
            </h3>
            <ul className="space-y-2">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <li
                  key={shortcut.keys}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                    {shortcut.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          {/* FAQ */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageCircleQuestion className="h-4 w-4" />
              H&auml;ufige Fragen
            </h3>
            <div className="space-y-1">
              {FAQ_ITEMS.map((faq, index) => (
                <div key={index} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFaq(expandedFaq === index ? null : index)
                    }
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium hover:bg-accent/50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        expandedFaq === index && "rotate-180"
                      )}
                    />
                  </button>
                  {expandedFaq === index && (
                    <div className="border-t px-3 py-2.5 text-sm text-muted-foreground">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Support Contact */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4" />
              Support kontaktieren
            </h3>
            <p className="text-sm text-muted-foreground">
              Bei Fragen oder Problemen erreichen Sie uns unter:
            </p>
            <a
              href="mailto:support@leadsolution.de"
              className="mt-1 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              support@leadsolution.de
            </a>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
