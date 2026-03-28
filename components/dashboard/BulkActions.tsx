"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { X, UserPlus, RefreshCw, Download, Trash2, Loader2 } from "lucide-react"
import { getStatusLabel } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BeraterOption {
  id: string
  profile_id: string
  profiles: { full_name: string } | null
}

interface BulkActionsProps {
  selectedIds: string[]
  onAction: () => void
  onClear: () => void
  isAdmin?: boolean
}

const STATUS_OPTIONS = [
  "neu",
  "zugewiesen",
  "kontaktversuch",
  "nicht_erreicht",
  "qualifiziert",
  "termin",
  "show",
  "no_show",
  "nachfassen",
  "abschluss",
  "verloren",
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BulkActions({
  selectedIds,
  onAction,
  onClear,
  isAdmin = false,
}: BulkActionsProps) {
  const supabase = createClient()
  const [beraterList, setBeraterList] = useState<BeraterOption[]>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    supabase
      .from("berater")
      .select("id, profile_id, profiles:profile_id(full_name)")
      .eq("status", "aktiv")
      .then(({ data }) => {
        if (data) setBeraterList(data as unknown as BeraterOption[])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (selectedIds.length === 0) return null

  async function handleAssign(beraterId: string) {
    setProcessing(true)
    const now = new Date().toISOString()

    const { error } = await supabase
      .from("leads")
      .update({
        berater_id: beraterId,
        status: "zugewiesen" as const,
        zugewiesen_am: now,
      })
      .in("id", selectedIds)

    if (error) {
      toast.error("Zuweisung fehlgeschlagen: " + error.message)
    } else {
      toast.success(`${selectedIds.length} Lead(s) zugewiesen`)
      onAction()
    }
    setProcessing(false)
  }

  async function handleStatusChange(status: string) {
    setProcessing(true)

    const { error } = await supabase
      .from("leads")
      .update({ status: status as never })
      .in("id", selectedIds)

    if (error) {
      toast.error("Status-Änderung fehlgeschlagen: " + error.message)
    } else {
      toast.success(`${selectedIds.length} Lead(s) auf "${getStatusLabel(status)}" gesetzt`)
      onAction()
    }
    setProcessing(false)
  }

  async function handleExport() {
    setProcessing(true)
    try {
      const { data } = await supabase
        .from("leads")
        .select("vorname, nachname, email, telefon, status, source, created_at")
        .in("id", selectedIds)

      if (!data || data.length === 0) {
        toast.error("Keine Daten zum Exportieren")
        setProcessing(false)
        return
      }

      const headers = ["Vorname", "Nachname", "E-Mail", "Telefon", "Status", "Quelle", "Erstellt"]
      const rows = data.map((l) => [
        l.vorname ?? "",
        l.nachname ?? "",
        l.email ?? "",
        l.telefon ?? "",
        l.status,
        l.source,
        l.created_at,
      ])

      const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`${data.length} Lead(s) exportiert`)
    } catch {
      toast.error("Export fehlgeschlagen")
    }
    setProcessing(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Wirklich ${selectedIds.length} Lead(s) löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }

    setProcessing(true)

    const { error } = await supabase
      .from("leads")
      .delete()
      .in("id", selectedIds)

    if (error) {
      toast.error("Löschen fehlgeschlagen: " + error.message)
    } else {
      toast.success(`${selectedIds.length} Lead(s) gelöscht`)
      onAction()
    }
    setProcessing(false)
  }

  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-lg">
      {processing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
          {selectedIds.length}
        </span>
        <span className="text-sm font-medium">ausgewählt</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Assign to berater */}
      <Select disabled={processing} onValueChange={handleAssign}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <span className="flex items-center gap-1">
            <UserPlus className="h-3 w-3" />
            <SelectValue placeholder="Zuweisen an..." />
          </span>
        </SelectTrigger>
        <SelectContent>
          {beraterList.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.profiles?.full_name ?? b.profile_id}
            </SelectItem>
          ))}
          {beraterList.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Keine aktiven Berater
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Change status */}
      <Select disabled={processing} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <SelectValue placeholder="Status ändern" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {getStatusLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Export */}
      <Button
        variant="outline"
        size="sm"
        disabled={processing}
        onClick={handleExport}
        className="h-8 text-xs"
      >
        <Download className="mr-1 h-3 w-3" />
        Exportieren
      </Button>

      {/* Delete (admin only) */}
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          disabled={processing}
          onClick={handleDelete}
          className="h-8 border-destructive text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Löschen
        </Button>
      )}

      <div className="flex-1" />

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-8 text-xs"
      >
        <X className="mr-1 h-3 w-3" />
        Auswahl aufheben
      </Button>
    </div>
  )
}
