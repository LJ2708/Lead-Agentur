"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface EventListenerProps {
  userId: string
  beraterId?: string
}

export function EventListener({ userId, beraterId }: EventListenerProps) {
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (subscribedRef.current) return
    subscribedRef.current = true

    const supabase = createClient()

    // Listen for new leads assigned to this user (berater)
    if (beraterId) {
      supabase
        .channel("leads-realtime-events")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "leads",
            filter: `berater_id=eq.${beraterId}`,
          },
          (payload) => {
            const lead = payload.new as { vorname?: string; nachname?: string }
            const name = [lead.vorname, lead.nachname]
              .filter(Boolean)
              .join(" ") || "Unbekannt"
            toast.success(`Neuer Lead: ${name}`, {
              description: "Bitte zeitnah kontaktieren",
            })
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "leads",
            filter: `berater_id=eq.${beraterId}`,
          },
          (payload) => {
            const oldLead = payload.old as { status?: string }
            const newLead = payload.new as {
              status?: string
              vorname?: string
              nachname?: string
              sla_deadline?: string
            }

            // Status change notification
            if (oldLead.status !== newLead.status) {
              const name = [newLead.vorname, newLead.nachname]
                .filter(Boolean)
                .join(" ") || "Lead"
              toast.info(`${name}: Status geändert`, {
                description: `Neuer Status: ${newLead.status}`,
              })
            }

            // SLA warning: less than 5 minutes remaining
            if (newLead.sla_deadline) {
              const deadline = new Date(newLead.sla_deadline).getTime()
              const remaining = deadline - Date.now()
              if (remaining > 0 && remaining < 5 * 60_000) {
                const name = [newLead.vorname, newLead.nachname]
                  .filter(Boolean)
                  .join(" ") || "Lead"
                const mins = Math.ceil(remaining / 60_000)
                toast.warning(`SLA läuft ab: ${name}`, {
                  description: `Noch ${mins} Minute${mins > 1 ? "n" : ""} verbleibend`,
                })
              }
            }
          }
        )
        .subscribe()
    }

    // Listen for notifications targeted at this user
    supabase
      .channel("notifications-toast-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as {
            title?: string
            body?: string
            urgency?: string
          }
          if (notif.urgency === "high") {
            toast.warning(notif.title ?? "Benachrichtigung", {
              description: notif.body ?? undefined,
            })
          } else {
            toast.info(notif.title ?? "Benachrichtigung", {
              description: notif.body ?? undefined,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.channel("leads-realtime-events").unsubscribe()
      supabase.channel("notifications-toast-events").unsubscribe()
      subscribedRef.current = false
    }
  }, [userId, beraterId])

  return null
}
