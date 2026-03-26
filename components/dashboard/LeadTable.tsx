"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge"
import { formatDate } from "@/lib/utils"
import { ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

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

interface LeadTableProps {
  leads: Lead[]
  showBerater?: boolean
  showSetter?: boolean
  onStatusChange?: (leadId: string, newStatus: string) => void
}

type SortKey = "name" | "email" | "status" | "source" | "created_at"
type SortDir = "asc" | "desc"

export function LeadTable({
  leads,
  showBerater = false,
  showSetter = false,
  onStatusChange,
}: LeadTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

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
        cmp = `${a.nachname ?? ''} ${a.vorname ?? ''}`.localeCompare(
          `${b.nachname ?? ''} ${b.vorname ?? ''}`
        )
        break
      case "email":
        cmp = (a.email ?? '').localeCompare(b.email ?? '')
        break
      case "status":
        cmp = a.status.localeCompare(b.status)
        break
      case "source":
        cmp = (a.source ?? '').localeCompare(b.source ?? '')
        break
      case "created_at":
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
    }
    return sortDir === "asc" ? cmp : -cmp
  })

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
          sortKey === sortKeyName
            ? "text-foreground"
            : "text-muted-foreground"
        )}
        onClick={() => handleSort(sortKeyName)}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
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
              colSpan={showBerater && showSetter ? 8 : showBerater || showSetter ? 7 : 6}
              className="h-24 text-center text-muted-foreground"
            >
              Keine Leads gefunden.
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((lead) => (
            <TableRow key={lead.id} className="cursor-default">
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
                  {lead.berater?.profiles?.full_name ?? "-"}
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
  )
}
