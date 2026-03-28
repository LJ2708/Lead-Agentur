"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge"
import { BulkActions } from "@/components/dashboard/BulkActions"
import { formatDate } from "@/lib/utils"
import { ArrowUpDown, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Lead {
  id: string
  vorname: string | null
  nachname: string | null
  email: string | null
  telefon: string | null
  status: string
  source: string
  created_at: string
  berater_id?: string | null
  berater?: { profiles?: { full_name: string | null } } | null
  besitzer?: { full_name: string | null } | null
}

interface BeraterOption {
  id: string
  profile_id: string
  status: string
  profiles: { full_name: string } | null
}

interface LeadTableProps {
  leads: Lead[]
  showBerater?: boolean
  showSetter?: boolean
  isAdmin?: boolean
  onLeadUpdated?: () => void
}

type SortKey = "name" | "email" | "status" | "source" | "created_at"
type SortDir = "asc" | "desc"

export function LeadTable({
  leads,
  showBerater = false,
  showSetter = false,
  isAdmin = false,
  onLeadUpdated,
}: LeadTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [beraterList, setBeraterList] = useState<BeraterOption[]>([])
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Clear selection when leads change
  useEffect(() => {
    setSelectedIds([])
  }, [leads])

  useEffect(() => {
    if (!showBerater) return
    const supabase = createClient()
    supabase
      .from("berater")
      .select("id, profile_id, status, profiles:profile_id(full_name)")
      .eq("status", "aktiv")
      .then(({ data }) => {
        if (data) setBeraterList(data as unknown as BeraterOption[])
      })
  }, [showBerater])

  async function assignBerater(leadId: string, beraterId: string) {
    setAssigningLeadId(leadId)
    const supabase = createClient()

    const { error } = await supabase
      .from("leads")
      .update({
        berater_id: beraterId,
        status: "zugewiesen" as const,
        zugewiesen_am: new Date().toISOString(),
      })
      .eq("id", leadId)

    if (error) {
      toast.error("Zuweisung fehlgeschlagen: " + error.message)
    } else {
      // Create activity
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        type: "zuweisung" as const,
        title: "Lead zugewiesen",
        description: `Lead wurde manuell einem Berater zugewiesen`,
      })
      toast.success("Lead erfolgreich zugewiesen")
      onLeadUpdated?.()
    }
    setAssigningLeadId(null)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = [...leads].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case "name":
        cmp = `${a.nachname ?? ""} ${a.vorname ?? ""}`.localeCompare(
          `${b.nachname ?? ""} ${b.vorname ?? ""}`
        )
        break
      case "email":
        cmp = (a.email ?? "").localeCompare(b.email ?? "")
        break
      case "status":
        cmp = a.status.localeCompare(b.status)
        break
      case "source":
        cmp = (a.source ?? "").localeCompare(b.source ?? "")
        break
      case "created_at":
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
    }
    return sortDir === "asc" ? cmp : -cmp
  })

  const allSelected = sorted.length > 0 && selectedIds.length === sorted.length
  const someSelected = selectedIds.length > 0 && !allSelected

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(sorted.map((l) => l.id))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const sourceLabel: Record<string, string> = {
    meta_lead_ad: "Meta Ad",
    landingpage: "Landingpage",
    manuell: "Manuell",
    import: "Import",
  }

  function SortHeader({
    label,
    sortKeyName,
  }: {
    label: string
    sortKeyName: SortKey
  }) {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          sortKey === sortKeyName ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => handleSort(sortKeyName)}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    )
  }

  const colSpanCount =
    (showBerater && showSetter ? 9 : showBerater || showSetter ? 8 : 7)

  return (
    <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </TableHead>
          <TableHead>
            <SortHeader label="Name" sortKeyName="name" />
          </TableHead>
          <TableHead>
            <SortHeader label="E-Mail" sortKeyName="email" />
          </TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead>
            <SortHeader label="Status" sortKeyName="status" />
          </TableHead>
          {showBerater && <TableHead>Berater</TableHead>}
          {showSetter && <TableHead>Setter</TableHead>}
          <TableHead>
            <SortHeader label="Quelle" sortKeyName="source" />
          </TableHead>
          <TableHead>
            <SortHeader label="Erstellt" sortKeyName="created_at" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={colSpanCount}
              className="h-24 text-center text-muted-foreground"
            >
              Keine Leads gefunden.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((lead) => (
            <TableRow
              key={lead.id}
              className={cn("cursor-default", selectedIds.includes(lead.id) && "bg-muted/50")}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </TableCell>
              <TableCell className="font-medium">
                {lead.vorname} {lead.nachname}
              </TableCell>
              <TableCell>{lead.email}</TableCell>
              <TableCell>{lead.telefon ?? "-"}</TableCell>
              <TableCell>
                <LeadStatusBadge status={lead.status} />
              </TableCell>
              {showBerater && (
                <TableCell>
                  {lead.berater?.profiles?.full_name ? (
                    <span className="text-sm">
                      {lead.berater.profiles.full_name}
                    </span>
                  ) : (
                    <Select
                      disabled={assigningLeadId === lead.id}
                      onValueChange={(val) => assignBerater(lead.id, val)}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <UserPlus className="h-3 w-3" />
                          <SelectValue placeholder="Zuweisen..." />
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
                  )}
                </TableCell>
              )}
              {showSetter && (
                <TableCell>
                  {lead.besitzer?.full_name ?? "-"}
                </TableCell>
              )}
              <TableCell>
                {sourceLabel[lead.source] ?? lead.source}
              </TableCell>
              <TableCell>{formatDate(lead.created_at)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>

    <BulkActions
      selectedIds={selectedIds}
      isAdmin={isAdmin}
      onAction={() => {
        setSelectedIds([])
        onLeadUpdated?.()
      }}
      onClear={() => setSelectedIds([])}
    />
    </div>
  )
}
