"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Loader2,
  Merge,
  AlertTriangle,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { getStatusLabel, getStatusColor } from "@/lib/utils"
import type { Database } from "@/types/database"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Lead = Database["public"]["Tables"]["leads"]["Row"]

interface DuplicatePair {
  leadA: Lead
  leadB: Lead
  matchType: string
  confidence: string
}

interface DuplicateFinderDialogProps {
  onClose: () => void
  onLeadsChanged: () => void
}

const CONFIDENCE_COLORS: Record<string, string> = {
  hoch: "bg-red-100 text-red-800",
  mittel: "bg-amber-100 text-amber-800",
  niedrig: "bg-gray-100 text-gray-800",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DuplicateFinderDialog({
  onClose,
  onLeadsChanged,
}: DuplicateFinderDialogProps) {
  const [loading, setLoading] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicatePair[] | null>(null)
  const [mergingPair, setMergingPair] = useState<string | null>(null)

  async function handleScan() {
    setLoading(true)
    try {
      const res = await fetch("/api/leads/duplicates")
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Fehler beim Suchen")
      }
      const data = await res.json()
      setDuplicates(data.duplicates ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMerge(pair: DuplicatePair) {
    const pairKey = `${pair.leadA.id}:${pair.leadB.id}`
    setMergingPair(pairKey)

    try {
      const res = await fetch("/api/leads/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_lead_id: pair.leadA.id,
          secondary_lead_id: pair.leadB.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Fehler beim Zusammenführen")
      }

      toast.success("Leads erfolgreich zusammengeführt")

      // Remove merged pair and any pairs involving the deleted lead
      setDuplicates((prev) =>
        (prev ?? []).filter(
          (d) => d.leadB.id !== pair.leadB.id && d.leadA.id !== pair.leadB.id
        )
      )
      onLeadsChanged()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      toast.error(message)
    } finally {
      setMergingPair(null)
    }
  }

  const leadName = (lead: Lead) =>
    [lead.vorname, lead.nachname].filter(Boolean).join(" ") || "Unbekannt"

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duplikate finden</DialogTitle>
          <DialogDescription>
            Sucht nach Leads mit gleicher E-Mail, gleichem Telefon oder gleichem Namen.
          </DialogDescription>
        </DialogHeader>

        {duplicates === null && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Search className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Klicken Sie auf &bdquo;Duplikate suchen&ldquo;, um alle Leads der letzten
              6 Monate auf mögliche Duplikate zu prüfen.
            </p>
            <Button onClick={handleScan} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Duplikate suchen
            </Button>
          </div>
        )}

        {loading && duplicates === null && (
          <div className="space-y-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {duplicates !== null && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {duplicates.length} mögliche Duplikate gefunden
              </p>
              <Button variant="outline" size="sm" onClick={handleScan} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Erneut suchen
              </Button>
            </div>

            <Separator />

            {duplicates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Keine Duplikate gefunden. Alle Leads scheinen einzigartig zu sein.
                </p>
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {duplicates.map((pair) => {
                const pairKey = `${pair.leadA.id}:${pair.leadB.id}`
                const isMerging = mergingPair === pairKey

                return (
                  <div
                    key={pairKey}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 grid gap-1 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium">{leadName(pair.leadA)}</p>
                          <p className="text-xs text-muted-foreground">
                            {pair.leadA.email ?? "Keine E-Mail"} &middot;{" "}
                            {pair.leadA.telefon ?? "Kein Telefon"}
                          </p>
                          <Badge className={getStatusColor(pair.leadA.status)} variant="outline">
                            {getStatusLabel(pair.leadA.status)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{leadName(pair.leadB)}</p>
                          <p className="text-xs text-muted-foreground">
                            {pair.leadB.email ?? "Keine E-Mail"} &middot;{" "}
                            {pair.leadB.telefon ?? "Kein Telefon"}
                          </p>
                          <Badge className={getStatusColor(pair.leadB.status)} variant="outline">
                            {getStatusLabel(pair.leadB.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={CONFIDENCE_COLORS[pair.confidence] ?? ""} variant="outline">
                          {pair.matchType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {pair.confidence === "hoch"
                            ? "Hohe Übereinstimmung"
                            : pair.confidence === "mittel"
                              ? "Mittlere Übereinstimmung"
                              : "Niedrige Übereinstimmung"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-muted-foreground">
                        Lead B wird in Lead A zusammengeführt und anschließend gelöscht.
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        disabled={isMerging || mergingPair !== null}
                        onClick={() => handleMerge(pair)}
                      >
                        {isMerging ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Merge className="mr-1 h-3 w-3" />
                        )}
                        Zusammenführen
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
