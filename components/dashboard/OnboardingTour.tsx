"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TourStep {
  selector: string
  title: string
  description: string
  position: "top" | "bottom" | "left" | "right"
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='smart-inbox']",
    title: "Das ist deine Smart Inbox",
    description:
      "Hier siehst du alle deine Leads, sortiert nach Priorität. Die wichtigsten Leads stehen oben.",
    position: "top",
  },
  {
    selector: "[data-tour='stats']",
    title: "Hier siehst du dein Kontingent",
    description:
      "Dein aktueller Verbrauch, offene Leads und Termine auf einen Blick.",
    position: "bottom",
  },
  {
    selector: "[data-tour='lead-card']",
    title: "Klicke auf einen Lead zum Kontaktieren",
    description:
      "Jeder Lead zeigt dir alle relevanten Infos. Klicke drauf, um den Kontakt zu starten.",
    position: "bottom",
  },
  {
    selector: "[data-tour='search']",
    title: "Nutze \u2318K für die Schnellsuche",
    description:
      "Mit der Tastenkombination \u2318K öffnest du die Schnellsuche, um Leads und Funktionen schnell zu finden.",
    position: "bottom",
  },
  {
    selector: "[data-tour='performance']",
    title: "Hier siehst du deine Performance",
    description:
      "Verfolge deine Fortschritte, Conversion-Raten und vergleiche dich mit anderen Beratern.",
    position: "top",
  },
]

const STORAGE_KEY = "onboarding-tour-completed"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [highlight, setHighlight] = useState<DOMRect | null>(null)

  // Check if tour was already completed
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (!completed) {
        // Small delay to let the page render first
        const timer = setTimeout(() => setActive(true), 800)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  const updateHighlight = useCallback(() => {
    if (!active) return
    const currentStep = TOUR_STEPS[step]
    if (!currentStep) return

    const el = document.querySelector(currentStep.selector)
    if (el) {
      const rect = el.getBoundingClientRect()
      setHighlight(rect)
    } else {
      // Element not found, show tooltip centered
      setHighlight(null)
    }
  }, [active, step])

  useEffect(() => {
    updateHighlight()
    window.addEventListener("resize", updateHighlight)
    window.addEventListener("scroll", updateHighlight)
    return () => {
      window.removeEventListener("resize", updateHighlight)
      window.removeEventListener("scroll", updateHighlight)
    }
  }, [updateHighlight])

  function completeTour() {
    setActive(false)
    try {
      localStorage.setItem(STORAGE_KEY, "true")
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

  function handleSkip() {
    completeTour()
  }

  if (!active) return null

  const currentStep = TOUR_STEPS[step]
  if (!currentStep) return null

  // Calculate tooltip position
  const padding = 8
  let tooltipStyle: React.CSSProperties = {}

  if (highlight) {
    const pos = currentStep.position
    if (pos === "bottom") {
      tooltipStyle = {
        position: "fixed",
        top: highlight.bottom + padding,
        left: Math.max(16, highlight.left + highlight.width / 2 - 160),
      }
    } else if (pos === "top") {
      tooltipStyle = {
        position: "fixed",
        bottom: window.innerHeight - highlight.top + padding,
        left: Math.max(16, highlight.left + highlight.width / 2 - 160),
      }
    } else if (pos === "right") {
      tooltipStyle = {
        position: "fixed",
        top: Math.max(16, highlight.top + highlight.height / 2 - 40),
        left: highlight.right + padding,
      }
    } else {
      tooltipStyle = {
        position: "fixed",
        top: Math.max(16, highlight.top + highlight.height / 2 - 40),
        right: window.innerWidth - highlight.left + padding,
      }
    }
  } else {
    // Center fallback
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/50 transition-opacity" />

      {/* Highlight cutout */}
      {highlight && (
        <div
          className="fixed z-[9999] rounded-lg ring-4 ring-blue-500/60"
          style={{
            top: highlight.top - 4,
            left: highlight.left - 4,
            width: highlight.width + 8,
            height: highlight.height + 8,
            backgroundColor: "transparent",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="z-[10000] w-80 rounded-xl border bg-card p-4 shadow-xl"
        style={tooltipStyle}
      >
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-sm font-semibold">{currentStep.title}</h3>
          <button
            onClick={handleSkip}
            className="ml-2 rounded-md p-0.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {currentStep.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {step + 1} von {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSkip}
            >
              Überspringen
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleNext}>
              {step < TOUR_STEPS.length - 1 ? "Weiter" : "Fertig"}
            </Button>
          </div>
        </div>
        {/* Step dots */}
        <div className="mt-3 flex justify-center gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === step ? "bg-blue-600" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  )
}
