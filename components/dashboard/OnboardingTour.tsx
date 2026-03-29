"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, ChevronRight, Minimize2, Maximize2 } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TourStep {
  title: string
  description: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Das ist deine Smart Inbox",
    description:
      "Hier siehst du alle deine Leads, sortiert nach Priorität. Die wichtigsten Leads stehen oben.",
  },
  {
    title: "Hier siehst du dein Kontingent",
    description:
      "Dein aktueller Verbrauch, offene Leads und Termine auf einen Blick.",
  },
  {
    title: "Klicke auf einen Lead zum Kontaktieren",
    description:
      "Jeder Lead zeigt dir alle relevanten Infos. Klicke drauf, um den Kontakt zu starten.",
  },
  {
    title: "Nutze \u2318K für die Schnellsuche",
    description:
      "Mit der Tastenkombination \u2318K öffnest du die Schnellsuche, um Leads und Funktionen schnell zu finden.",
  },
  {
    title: "Hier siehst du deine Performance",
    description:
      "Verfolge deine Fortschritte, Conversion-Raten und vergleiche dich mit anderen Beratern.",
  },
]

const STORAGE_KEY = "onboarding-tour-completed"
const DISMISS_KEY = "onboarding-tour-dismissed"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [step, setStep] = useState(0)

  // Check if tour was already completed or temporarily dismissed
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (completed) return

      const dismissed = sessionStorage.getItem(DISMISS_KEY)
      if (dismissed) return

      // Small delay to let the page render first
      const timer = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(timer)
    } catch {
      // storage not available
    }
  }, [])

  function completeTour() {
    setActive(false)
    try {
      localStorage.setItem(STORAGE_KEY, "true")
    } catch {
      // ignore
    }
  }

  function dismissTemporarily() {
    setActive(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, "true")
    } catch {
      // ignore
    }
  }

  function handleNext() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      completeTour()
    }
  }

  if (!active) return null

  const currentStep = TOUR_STEPS[step]
  if (!currentStep) return null

  // Minimized state: small pill in bottom-right
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-full shadow-lg text-xs"
          onClick={() => setMinimized(false)}
        >
          <Maximize2 className="h-3 w-3" />
          Tour fortsetzen ({step + 1}/{TOUR_STEPS.length})
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-80 rounded-xl border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-[10px] font-medium text-muted-foreground">
          Einführung {step + 1}/{TOUR_STEPS.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-muted"
            title="Minimieren"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={dismissTemporarily}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-muted"
            title="Schließen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        <h3 className="text-sm font-semibold">{currentStep.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {currentStep.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={dismissTemporarily}
        >
          Später
        </Button>
        <div className="flex items-center gap-2">
          {/* Step dots */}
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === step ? "bg-blue-600" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleNext}>
            {step < TOUR_STEPS.length - 1 ? (
              <>
                Weiter
                <ChevronRight className="h-3 w-3" />
              </>
            ) : (
              "Fertig"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
