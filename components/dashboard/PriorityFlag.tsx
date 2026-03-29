"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Json } from "@/types/database"

type Priority = "none" | "low" | "medium" | "high" | "urgent"

interface PriorityFlagProps {
  leadId: string
  currentPriority: Priority
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  none: { label: "Keine", color: "text-gray-400", bg: "hover:bg-gray-100" },
  low: { label: "Niedrig", color: "text-blue-500", bg: "hover:bg-blue-50" },
  medium: { label: "Mittel", color: "text-yellow-500", bg: "hover:bg-yellow-50" },
  high: { label: "Hoch", color: "text-orange-500", bg: "hover:bg-orange-50" },
  urgent: { label: "Dringend", color: "text-red-500", bg: "hover:bg-red-50" },
}

const PRIORITY_ORDER: Priority[] = ["none", "low", "medium", "high", "urgent"]

export function PriorityFlag({ leadId, currentPriority }: PriorityFlagProps) {
  const [priority, setPriority] = useState<Priority>(currentPriority)
  const [saving, setSaving] = useState(false)

  const handleChange = useCallback(
    async (newPriority: Priority) => {
      if (saving) return
      setSaving(true)
      const supabase = createClient()

      // We need to read the current custom_fields first, then merge
      const { data: lead } = await supabase
        .from("leads")
        .select("custom_fields")
        .eq("id", leadId)
        .single()

      const existingFields =
        lead?.custom_fields && typeof lead.custom_fields === "object" && !Array.isArray(lead.custom_fields)
          ? (lead.custom_fields as Record<string, Json>)
          : {}

      const updatedFields: Record<string, Json> = {
        ...existingFields,
        priority: newPriority,
      }

      const { error } = await supabase
        .from("leads")
        .update({ custom_fields: updatedFields })
        .eq("id", leadId)

      if (error) {
        toast.error("Fehler beim Speichern der Prioritaet")
      } else {
        setPriority(newPriority)
      }

      setSaving(false)
    },
    [leadId, saving]
  )

  const config = PRIORITY_CONFIG[priority]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            config.bg,
            saving && "pointer-events-none opacity-50"
          )}
          title={`Prioritaet: ${config.label}`}
        >
          <Flag
            className={cn("h-3.5 w-3.5", config.color)}
            fill={priority !== "none" ? "currentColor" : "none"}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {PRIORITY_ORDER.map((p) => {
          const cfg = PRIORITY_CONFIG[p]
          return (
            <DropdownMenuItem
              key={p}
              onSelect={() => handleChange(p)}
              className="flex items-center gap-2"
            >
              <Flag
                className={cn("h-3.5 w-3.5", cfg.color)}
                fill={p !== "none" ? "currentColor" : "none"}
              />
              <span>{cfg.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
