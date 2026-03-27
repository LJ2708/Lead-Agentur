"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  type DragOverEvent,
} from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils"
import type { Database } from "@/types/database"
import { User, Mail, Phone, Clock, GripVertical } from "lucide-react"

type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  berater?: {
    profiles?: { full_name: string | null }
  } | null
}

interface LeadPipelineProps {
  leads: Lead[]
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>
  isAdmin?: boolean
}

interface PipelineColumn {
  id: string
  label: string
  statuses: string[]
  borderColor: string
  bgHover: string
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "neu",
    label: "Neu",
    statuses: ["neu", "warteschlange"],
    borderColor: "border-t-gray-400",
    bgHover: "bg-gray-50",
  },
  {
    id: "zugewiesen",
    label: "Zugewiesen",
    statuses: ["zugewiesen"],
    borderColor: "border-t-blue-500",
    bgHover: "bg-blue-50",
  },
  {
    id: "kontaktversuch",
    label: "Kontaktversuch",
    statuses: ["kontaktversuch", "nicht_erreicht"],
    borderColor: "border-t-yellow-500",
    bgHover: "bg-yellow-50",
  },
  {
    id: "qualifiziert",
    label: "Qualifiziert",
    statuses: ["qualifiziert"],
    borderColor: "border-t-purple-500",
    bgHover: "bg-purple-50",
  },
  {
    id: "termin",
    label: "Termin",
    statuses: ["termin", "show", "no_show"],
    borderColor: "border-t-indigo-500",
    bgHover: "bg-indigo-50",
  },
  {
    id: "nachfassen",
    label: "Nachfassen",
    statuses: ["nachfassen"],
    borderColor: "border-t-orange-500",
    bgHover: "bg-orange-50",
  },
  {
    id: "abschluss",
    label: "Abschluss",
    statuses: ["abschluss"],
    borderColor: "border-t-green-500",
    bgHover: "bg-green-50",
  },
  {
    id: "verloren",
    label: "Verloren",
    statuses: ["verloren"],
    borderColor: "border-t-red-500",
    bgHover: "bg-red-50",
  },
]

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffMinutes < 1) return "gerade eben"
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`
  if (diffHours < 24) return `vor ${diffHours} Std.`
  if (diffDays === 1) return "vor 1 Tag"
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  if (diffWeeks === 1) return "vor 1 Woche"
  if (diffWeeks < 5) return `vor ${diffWeeks} Wochen`
  if (diffMonths === 1) return "vor 1 Monat"
  return `vor ${diffMonths} Monaten`
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    meta_lead_ad: "Meta",
    landingpage: "Landingpage",
    manuell: "Manuell",
    import: "Import",
  }
  return labels[source] ?? source
}

// --- Draggable Lead Card ---

function DraggableLeadCard({
  lead,
  isAdmin,
  showSubStatus,
}: {
  lead: Lead
  isAdmin?: boolean
  showSubStatus: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lead.id,
      data: { lead },
    })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow",
        "hover:shadow-md",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20"
      )}
    >
      <LeadCardContent
        lead={lead}
        isAdmin={isAdmin}
        showSubStatus={showSubStatus}
      />
    </div>
  )
}

// --- Card Content (shared between card and overlay) ---

function LeadCardContent({
  lead,
  isAdmin,
  showSubStatus,
}: {
  lead: Lead
  isAdmin?: boolean
  showSubStatus: boolean
}) {
  const name = [lead.vorname, lead.nachname].filter(Boolean).join(" ") || "Unbekannt"
  const contact = lead.email || lead.telefon

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight truncate">{name}</p>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      </div>

      {contact && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          {lead.email ? (
            <Mail className="h-3 w-3 shrink-0" />
          ) : (
            <Phone className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{contact}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {getSourceLabel(lead.source)}
        </span>

        {showSubStatus && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              getStatusColor(lead.status)
            )}
          >
            {getStatusLabel(lead.status)}
          </span>
        )}
      </div>

      {isAdmin && lead.berater?.profiles?.full_name && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.berater.profiles.full_name}</span>
        </div>
      )}

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
        <Clock className="h-3 w-3 shrink-0" />
        <span>{getTimeAgo(lead.created_at)}</span>
      </div>
    </div>
  )
}

// --- Droppable Column ---

function DroppableColumn({
  column,
  leads,
  isAdmin,
  isOver,
}: {
  column: PipelineColumn
  leads: Lead[]
  isAdmin?: boolean
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { column },
  })

  const hasMultipleStatuses = column.statuses.length > 1

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border-t-[3px] bg-muted/30 min-w-[260px] w-[260px] shrink-0 transition-colors",
        column.borderColor,
        isOver && cn(column.bgHover, "ring-2 ring-primary/20")
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/50">
        <h3 className="text-sm font-semibold text-foreground">
          {column.label}
        </h3>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
          {leads.length}
        </span>
      </div>

      {/* Card List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)] min-h-[120px]">
        {leads.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
            Keine Leads
          </div>
        ) : (
          leads.map((lead) => (
            <DraggableLeadCard
              key={lead.id}
              lead={lead}
              isAdmin={isAdmin}
              showSubStatus={hasMultipleStatuses}
            />
          ))
        )}
      </div>
    </div>
  )
}

// --- Main Component ---

export function LeadPipeline({ leads, onStatusChange, isAdmin }: LeadPipelineProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const columnLeads = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const col of PIPELINE_COLUMNS) {
      map.set(col.id, [])
    }
    for (const lead of leads) {
      for (const col of PIPELINE_COLUMNS) {
        if (col.statuses.includes(lead.status)) {
          map.get(col.id)!.push(lead)
          break
        }
      }
    }
    return map
  }, [leads])

  function handleDragStart(event: DragStartEvent) {
    const lead = event.active.data.current?.lead as Lead | undefined
    if (lead) setActiveLead(lead)
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id as string | undefined
    if (overId && PIPELINE_COLUMNS.some((c) => c.id === overId)) {
      setOverColumnId(overId)
    } else {
      setOverColumnId(null)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    setOverColumnId(null)

    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const targetColumnId = over.id as string

    const targetColumn = PIPELINE_COLUMNS.find((c) => c.id === targetColumnId)
    if (!targetColumn) return

    // Find current column of the lead
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const currentColumn = PIPELINE_COLUMNS.find((c) =>
      c.statuses.includes(lead.status)
    )
    if (!currentColumn || currentColumn.id === targetColumn.id) return

    // Use the first status of the target column as the new status
    const newStatus = targetColumn.statuses[0]
    await onStatusChange(leadId, newStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            leads={columnLeads.get(column.id) ?? []}
            isAdmin={isAdmin}
            isOver={overColumnId === column.id}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="rounded-lg border bg-card p-3 shadow-xl w-[244px] rotate-2 opacity-90">
            <LeadCardContent
              lead={activeLead}
              isAdmin={isAdmin}
              showSubStatus={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
