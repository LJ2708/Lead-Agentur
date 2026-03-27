"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Lightbulb,
  Zap,
  Phone,
  Star,
  Flame,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { RepPerformance } from "@/lib/performance/scoring"

interface BehavioralNudgeProps {
  beraterId: string
}

interface Nudge {
  icon: LucideIcon
  iconColor: string
  bgColor: string
  message: string
  key: string
}

function generateNudge(data: RepPerformance): Nudge | null {
  // Priority-ordered nudges

  // High close rate - positive reinforcement
  if (data.closeRate > 15) {
    return {
      icon: Star,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50 border-yellow-200",
      message:
        "Gro\u00dfartige Arbeit! Ihre Abschlussrate liegt \u00fcber dem Team-Durchschnitt.",
      key: "star_close_rate",
    }
  }

  // SLA rate low
  if (data.slaRate < 80) {
    return {
      icon: Lightbulb,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 border-blue-200",
      message:
        "Tipp: Leads innerhalb von 30 Minuten kontaktieren erh\u00f6ht die Abschlussrate um 40%.",
      key: "tip_sla",
    }
  }

  // Slow accept time
  if (data.avgTimeToAccept !== null && data.avgTimeToAccept > 120) {
    return {
      icon: Zap,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50 border-amber-200",
      message:
        "Schnellere Annahme = mehr Leads. Top-Berater akzeptieren in unter 60 Sekunden.",
      key: "tip_speed",
    }
  }

  // Low contact rate
  if (data.contactRate < 60) {
    return {
      icon: Phone,
      iconColor: "text-green-500",
      bgColor: "bg-green-50 border-green-200",
      message:
        "Tipp: Versuchen Sie jeden Lead mindestens 3x zu erreichen.",
      key: "tip_contact",
    }
  }

  // SLA streak (good SLA)
  if (data.slaRate >= 95) {
    return {
      icon: Flame,
      iconColor: "text-orange-500",
      bgColor: "bg-orange-50 border-orange-200",
      message:
        "Hervorragend! Ihre SLA-Quote liegt bei \u00fcber 95% \u2013 weiter so!",
      key: "streak_sla",
    }
  }

  return null
}

export function BehavioralNudge({ beraterId }: BehavioralNudgeProps) {
  const [nudge, setNudge] = useState<Nudge | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/performance?beraterId=${beraterId}&period=week`
      )
      if (res.ok) {
        const json: RepPerformance = await res.json()
        const generated = generateNudge(json)
        // Check if dismissed today
        if (generated) {
          const dismissKey = `nudge_dismissed_${generated.key}`
          const dismissedAt = localStorage.getItem(dismissKey)
          if (dismissedAt) {
            const dismissDate = new Date(dismissedAt).toDateString()
            const today = new Date().toDateString()
            if (dismissDate === today) {
              setNudge(null)
              setLoading(false)
              return
            }
          }
        }
        setNudge(generated)
      }
    } catch {
      // Silently handle error
    } finally {
      setLoading(false)
    }
  }, [beraterId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDismiss = () => {
    if (nudge) {
      const dismissKey = `nudge_dismissed_${nudge.key}`
      localStorage.setItem(dismissKey, new Date().toISOString())
    }
    setDismissed(true)
  }

  if (loading || dismissed || !nudge) return null

  const Icon = nudge.icon

  return (
    <Card className={`border ${nudge.bgColor}`}>
      <CardContent className="flex items-center gap-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon className={`h-5 w-5 ${nudge.iconColor}`} />
        </div>
        <p className="flex-1 text-sm font-medium text-foreground">
          {nudge.message}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Schlie\u00dfen</span>
        </Button>
      </CardContent>
    </Card>
  )
}
