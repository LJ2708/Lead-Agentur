"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/types/database"
import type { RealtimeChannel } from "@supabase/supabase-js"

type Lead = Tables<"leads">

interface UseRealtimeLeadsOptions {
  /** Filter by berater_id */
  beraterId?: string
  /** Filter by setter_id */
  setterId?: string
}

interface UseRealtimeLeadsReturn {
  leads: Lead[]
  loading: boolean
  refresh: () => void
}

export function useRealtimeLeads(
  options: UseRealtimeLeadsOptions
): UseRealtimeLeadsReturn {
  const { beraterId, setterId } = options
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchLeads = useCallback(async () => {
    const supabase = createClient()
    let query = supabase.from("leads").select("*")

    if (beraterId) {
      query = query.eq("berater_id", beraterId)
    }
    if (setterId) {
      query = query.eq("setter_id", setterId)
    }

    query = query.order("created_at", { ascending: false })

    const { data, error } = await query
    if (!error && data) {
      setLeads(data)
    }
    setLoading(false)
  }, [beraterId, setterId])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    fetchLeads()

    const supabase = createClient()
    const filterColumn = beraterId ? "berater_id" : setterId ? "setter_id" : null
    const filterValue = beraterId ?? setterId ?? null

    if (!filterColumn || !filterValue) return

    const channel = supabase
      .channel(`leads-realtime-${filterValue}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          const newLead = payload.new as Lead
          setLeads((prev) => [newLead, ...prev])
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          const updated = payload.new as Lead
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l))
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "leads",
        },
        (payload) => {
          const deleted = payload.old as { id: string }
          setLeads((prev) => prev.filter((l) => l.id !== deleted.id))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [beraterId, setterId, fetchLeads])

  return { leads, loading, refresh }
}
