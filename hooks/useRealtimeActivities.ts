"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/types/database"
import type { RealtimeChannel } from "@supabase/supabase-js"

type Activity = Tables<"lead_activities">

interface UseRealtimeActivitiesReturn {
  activities: Activity[]
  loading: boolean
}

export function useRealtimeActivities(
  leadIds: string[]
): UseRealtimeActivitiesReturn {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const leadIdsKey = leadIds.sort().join(",")

  useEffect(() => {
    if (leadIds.length === 0) {
      setActivities([])
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function fetchActivities() {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setActivities(data)
      }
      setLoading(false)
    }

    fetchActivities()

    const channel = supabase
      .channel(`activities-realtime-${leadIdsKey.slice(0, 50)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_activities",
        },
        (payload) => {
          const newActivity = payload.new as Activity
          if (leadIds.includes(newActivity.lead_id)) {
            setActivities((prev) => [newActivity, ...prev])
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadIdsKey])

  return { activities, loading }
}
