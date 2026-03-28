"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, ExternalLink, X } from "lucide-react"
import Link from "next/link"
import type { DuplicateResult } from "@/lib/leads/dedup"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DuplicateWarningProps {
  duplicate: DuplicateResult
  onIgnore: () => void
  onMerge?: () => void
}

// ---------------------------------------------------------------------------
// Match type labels
// ---------------------------------------------------------------------------

const MATCH_LABELS: Record<string, string> = {
  email: "E-Mail-Adresse stimmt überein",
  phone: "Telefonnummer stimmt überein",
  "email+phone": "E-Mail und Telefon stimmen überein",
  "name+phone": "Name und Telefon stimmen überein",
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "Hohe Übereinstimmung",
  medium: "Mittlere Übereinstimmung",
  low: "Niedrige Übereinstimmung",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DuplicateWarning({ duplicate, onIgnore }: DuplicateWarningProps) {
  if (!duplicate.isDuplicate) return null

  const matchLabel = duplicate.matchType
    ? MATCH_LABELS[duplicate.matchType] ?? duplicate.matchType
    : "Unbekannter Übereinstimmungstyp"

  const confidenceLabel = CONFIDENCE_LABELS[duplicate.confidence] ?? duplicate.confidence

  return (
    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              Mögliches Duplikat gefunden
            </h4>
            <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-[10px] font-medium text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
              {confidenceLabel}
            </span>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {matchLabel}
          </p>
          {duplicate.matchedLeadId && (
            <Link
              href={`/admin/leads`}
              className="inline-flex items-center gap-1 text-sm font-medium text-yellow-800 underline hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100"
            >
              Bestehenden Lead anzeigen
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onIgnore}
          className="shrink-0 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800 dark:hover:text-yellow-100"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Ignorieren
        </Button>
      </div>
    </div>
  )
}
