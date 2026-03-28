"use client"

import { useState, useEffect } from "react"
import { useInstallPrompt } from "@/hooks/useInstallPrompt"
import { X, Download } from "lucide-react"

const DISMISS_KEY = "leadsolution-install-banner-dismissed"

export function InstallBanner() {
  const { isInstallable, promptInstall } = useInstallPrompt()
  const [isDismissed, setIsDismissed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    setIsDismissed(dismissed === "true")

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem(DISMISS_KEY, "true")
  }

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (accepted) {
      handleDismiss()
    }
  }

  if (!isInstallable || isDismissed || !isMobile) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-primary-foreground">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Download className="h-4 w-4 shrink-0" />
        <span>LeadSolution als App installieren</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="rounded-md bg-primary-foreground/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-primary-foreground/30"
        >
          Installieren
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 transition-colors hover:bg-primary-foreground/20"
          aria-label="Schliessen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
