"use client"

import { cn } from "@/lib/utils"
import { getStatusColor, getStatusLabel } from "@/lib/utils"

interface LeadStatusBadgeProps {
  status: string
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        getStatusColor(status),
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  )
}
