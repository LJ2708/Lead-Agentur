"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

interface SlaTimerProps {
  deadline: string
  status: "none" | "active" | "met" | "breached"
}

export function SlaTimer({ deadline, status }: SlaTimerProps) {
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    if (status !== "active") return

    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      setRemaining(Math.max(0, diff))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [deadline, status])

  if (status === "none") return null

  if (status === "met") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>SLA eingehalten</span>
      </div>
    )
  }

  if (status === "breached") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
        <XCircle className="h-3.5 w-3.5" />
        <span>SLA überschritten</span>
      </div>
    )
  }

  // Active countdown
  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  const isGreen = remaining > 15 * 60 * 1000
  const isYellow = remaining > 5 * 60 * 1000 && remaining <= 15 * 60 * 1000
  const isRed = remaining > 2 * 60 * 1000 && remaining <= 5 * 60 * 1000
  const isPulsing = remaining <= 2 * 60 * 1000

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        isGreen && "bg-emerald-50 text-emerald-700",
        isYellow && "bg-yellow-50 text-yellow-700",
        isRed && "bg-red-50 text-red-700",
        isPulsing && "animate-pulse bg-red-100 text-red-700"
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      <span>{display} verbleibend</span>
    </div>
  )
}
