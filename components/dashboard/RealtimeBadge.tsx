"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"


interface RealtimeBadgeProps {
  table: string
  filter?: { column: string; value: string }
  label: string
}

export function RealtimeBadge({ table, filter, label }: RealtimeBadgeProps) {
  const [count, setCount] = useState(0)
  const [pulse, setPulse] = useState(false)

  const fetchCount = useCallback(async () => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from as any)(table).select("*", { count: "exact", head: true })
    if (filter) {
      query = query.eq(filter.column, filter.value)
    }
    const { count: result } = await query
    setCount(result ?? 0)
  }, [table, filter])

  useEffect(() => {
    fetchCount()

    const supabase = createClient()
    const channelName = `realtime-badge-${table}-${filter?.column ?? "all"}-${filter?.value ?? "all"}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => {
          fetchCount()
          setPulse(true)
          setTimeout(() => setPulse(false), 2000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, fetchCount])

  if (count === 0) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`inline-block h-2 w-2 rounded-full bg-green-500 ${
          pulse ? "animate-ping" : ""
        }`}
      />
      <span className="text-muted-foreground">
        {count} {label}
      </span>
    </span>
  )
}
