"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Search,
  ArrowRight,
  AlertTriangle,
  Check,
  Merge,
} from "lucide-react"
import { toast } from "sonner"
import { getStatusLabel, getStatusColor } from "@/lib/utils"
import type { Database } from "@/types/database"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Lead = Database["public"]["Tables"]["leads"]["Row"]

interface LeadMergeDialogProps {
  primaryLead: Lead
  onClose: () => void
  onMerged: () => void
}

// Status priority for preview
const STATUS_PRIORITY: Record<string, number> = {
  abschluss: 10, show: 9, termin: 8, qualifiziert: 7,
  kontaktversuch: 6, nachfassen: 5, zugewiesen: 4,
  nicht_erreicht: 3, no_show: 2, neu: 1, warteschlange: 0, verloren: -1,
}

// ---------------------------------------------------------------------------
// Field definitions for comparison
// ---------------------------------------------------------------------------

interface FieldDef {
  key: string
  label: string
  getValue: (lead: Lead) => string
}

const COMPARE_FIELDS: FieldDef[] = [
  { key: "vorname", label: "Vorname", getValue: (l) => l.vorname ?? "" },
  { key: "nachname", label: "Nachname", getValue: (l) => l.nachname ?? "" },
  { key: "email", label: "E-Mail", getValue: (l) => l.email ?? "" },
  { key: "telefon", label: "Telefon", getValue: (l) => l.telefon ?? "" },
  { key: "status", label: "Status", getValue: (l) => getStatusLabel(l.status) },
  { key: "source", label: "Quelle", getValue: (l) => l.source },
  { key: "campaign", label: "Kampagne", getValue: (l) => l.campaign ?? "" },
  { key: "berater_id", label: "Berater-ID", getValue: (l) => l.berater_id ?? "Keiner" },
  {
    key: "kontaktversuche",
    label: "Kontaktversuche",
    getValue: (l) => String(l.kontaktversuche),
  },
  {
    key: "opt_in_email",
    label: "Opt-in E-Mail",
    getValue: (l) => l.opt_in_email ? "Ja" : "Nein",
  },
  {
    key: "opt_in_whatsapp",
    label: "Opt-in WhatsApp",
    getValue: (l) => l.opt_in_whatsapp ? "Ja" : "Nein",
  },
  {
    key: "opt_in_telefon",
    label: "Opt-in Telefon",
    getValue: (l) => l.opt_in_telefon ? "Ja" : "Nein",
  },
  {
    key: "created_at",
    label: "Erstellt am",
    getValue: (l) => new Date(l.created_at).toLocaleDateString("de-DE"),
  },
]

function getMergedValue(field: FieldDef, primary: Lead, secondary: Lead): string {
  const pVal = field.getValue(primary)
  const sVal = field.getValue(secondary)

  if (field.key === "status") {
    const pPriority = STATUS_PRIORITY[primary.status] ?? 0
    const sPriority = STATUS_PRIORITY[secondary.status] ?? 0
    return sPriority > pPriority ? sVal : pVal
  }

  if (field.key === "kontaktversuche") {
    return String(primary.kontaktversuche + secondary.kontaktversuche)
  }

  if (field.key === "created_at") {
    const pDate = new Date(primary.created_at)
    const sDate = new Date(secondary.created_at)
    return sDate < pDate
      ? sDate.toLocaleDateString("de-DE")
      : pDate.toLocaleDateString("de-DE")
  }

  if (field.key.startsWith("opt_in_")) {
    const pBool = field.key === "opt_in_email"
      ? primary.opt_in_email
      : field.key === "opt_in_whatsapp"
        ? primary.opt_in_whatsapp
        : primary.opt_in_telefon
    const sBool = field.key === "opt_in_email"
      ? secondary.opt_in_email
      : field.key === "opt_in_whatsapp"
        ? secondary.opt_in_whatsapp
        : secondary.opt_in_telefon
    return pBool || sBool ? "Ja" : "Nein"
  }

  if (field.key === "berater_id") {
    return pVal !== "Keiner" ? pVal : sVal
  }

  // Default: keep primary if set, otherwise secondary
  return pVal || sVal
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadMergeDialog({
  primaryLead,
  onClose,
  onMerged,
}: LeadMergeDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [searching, setSearching] = useState(false)
  const [secondaryLead, setSecondaryLead] = useState<Lead | null>(null)
  const [merging, setMerging] = useState(false)

  const supabase = createClient()

  const handleSearch = useCallback(async () => {
    const term = searchQuery.trim()
    if (term.length < 2) return

    setSearching(true)
    const searchTerm = `%${term}%`

    const { data } = await supabase
      .from("leads")
      .select("*")
      .neq("id", primaryLead.id)
      .or(
        `vorname.ilike.${searchTerm},nachname.ilike.${searchTerm},email.ilike.${searchTerm},telefon.ilike.${searchTerm}`
      )
      .order("created_at", { ascending: false })
      .limit(10)

    setSearchResults(data ?? [])
    setSearching(false)
  }, [searchQuery, primaryLead.id, supabase])

  function handleSelectSecondary(lead: Lead) {
    setSecondaryLead(lead)
    setStep(2)
  }

  async function handleMerge() {
    if (!secondaryLead) return
    setMerging(true)

    try {
      const res = await fetch("/api/leads/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_lead_id: primaryLead.id,
          secondary_lead_id: secondaryLead.id,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error ?? "Fehler beim Zusammenführen")
      }

      toast.success("Leads erfolgreich zusammengeführt")
      onMerged()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      toast.error(message)
    } finally {
      setMerging(false)
    }
  }

  const leadName = (lead: Lead) =>
    [lead.vorname, lead.nachname].filter(Boolean).join(" ") || "Unbekannt"

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leads zusammenführen</DialogTitle>
          <DialogDescription>
            {step === 1 && "Wählen Sie den Duplikat-Lead aus, der zusammengeführt werden soll."}
            {step === 2 && "Überprüfen Sie die Zusammenführung der beiden Leads."}
            {step === 3 && "Bestätigen Sie die Zusammenführung."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={step >= 1 ? "default" : "outline"}>1. Duplikat wählen</Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant={step >= 2 ? "default" : "outline"}>2. Überprüfen</Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant={step >= 3 ? "default" : "outline"}>3. Bestätigen</Badge>
        </div>

        <Separator />

        {/* ---- STEP 1: Search & Select ---- */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Primärer Lead (wird beibehalten)
              </p>
              <p className="font-medium">{leadName(primaryLead)}</p>
              <p className="text-sm text-muted-foreground">
                {primaryLead.email ?? "Keine E-Mail"} &middot;{" "}
                {primaryLead.telefon ?? "Kein Telefon"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Duplikat suchen</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSearch()
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Name, E-Mail oder Telefon..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="outline" disabled={searching || searchQuery.trim().length < 2}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Suchen"
                  )}
                </Button>
              </form>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {searchResults.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => handleSelectSecondary(lead)}
                    className="w-full rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{leadName(lead)}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.email ?? "Keine E-Mail"} &middot;{" "}
                          {lead.telefon ?? "Kein Telefon"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(lead.status)} variant="outline">
                          {getStatusLabel(lead.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery.trim().length >= 2 && !searching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine passenden Leads gefunden.
              </p>
            )}
          </div>
        )}

        {/* ---- STEP 2: Review ---- */}
        {step === 2 && secondaryLead && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">
                      Feld
                    </th>
                    <th className="text-left py-2 px-3 font-medium">
                      Lead A (Primär)
                    </th>
                    <th className="text-left py-2 px-3 font-medium">
                      Lead B (Sekundär)
                    </th>
                    <th className="text-left py-2 pl-3 font-medium text-green-700">
                      Ergebnis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FIELDS.map((field) => {
                    const pVal = field.getValue(primaryLead)
                    const sVal = field.getValue(secondaryLead)
                    const merged = getMergedValue(field, primaryLead, secondaryLead)
                    const isDifferent = pVal !== sVal

                    return (
                      <tr
                        key={field.key}
                        className={
                          isDifferent
                            ? "border-b bg-amber-50"
                            : "border-b"
                        }
                      >
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {field.label}
                        </td>
                        <td className="py-2 px-3 break-all">
                          {pVal || <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="py-2 px-3 break-all">
                          {sVal || <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="py-2 pl-3 break-all font-medium">
                          {merged || <span className="text-muted-foreground">-</span>}
                          {isDifferent && (
                            <Check className="inline-block ml-1 h-3 w-3 text-green-600" />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => { setStep(1); setSecondaryLead(null) }}>
                Zurück
              </Button>
              <Button onClick={() => setStep(3)}>
                Weiter zur Bestätigung
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ---- STEP 3: Confirm ---- */}
        {step === 3 && secondaryLead && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <p className="text-sm text-muted-foreground">
                  &bdquo;{leadName(secondaryLead)}&ldquo; (Lead B) wird in
                  &bdquo;{leadName(primaryLead)}&ldquo; (Lead A) zusammengeführt.
                  Lead B wird anschließend unwiderruflich gelöscht.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3 bg-green-50">
                <p className="text-xs font-medium text-green-700 mb-1">
                  Wird beibehalten (Lead A)
                </p>
                <p className="font-medium">{leadName(primaryLead)}</p>
                <p className="text-xs text-muted-foreground">
                  #{primaryLead.id.slice(0, 8)}
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-red-50">
                <p className="text-xs font-medium text-red-700 mb-1">
                  Wird gelöscht (Lead B)
                </p>
                <p className="font-medium">{leadName(secondaryLead)}</p>
                <p className="text-xs text-muted-foreground">
                  #{secondaryLead.id.slice(0, 8)}
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Zurück
              </Button>
              <Button
                variant="destructive"
                onClick={handleMerge}
                disabled={merging}
              >
                {merging ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Merge className="mr-2 h-4 w-4" />
                )}
                Zusammenführen
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
