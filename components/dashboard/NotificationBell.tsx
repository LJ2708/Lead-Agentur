"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  Zap,
  AlertTriangle,
  AlertOctagon,
  ArrowRightLeft,
  CalendarDays,
  TrendingUp,
  Check,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, string> | null
  urgency: string
  is_read: boolean
  created_at: string
}

const typeIconMap: Record<string, LucideIcon> = {
  new_lead: Zap,
  sla_warning: AlertTriangle,
  sla_breach: AlertOctagon,
  lead_reassigned: ArrowRightLeft,
  appointment_reminder: CalendarDays,
  performance_update: TrendingUp,
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Gerade eben"
  if (mins < 60) return `Vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `Vor ${days} Tag${days > 1 ? "en" : ""}`
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data as unknown as Notification[])
      setUnreadCount(data.filter((n) => !n.is_read).length)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()

    // Subscribe to realtime inserts for current user
    let userId: string | null = null

    async function subscribe() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as unknown as Notification
            setNotifications((prev) => [newNotif, ...prev].slice(0, 10))
            setUnreadCount((prev) => prev + 1)
          }
        )
        .subscribe()
    }

    subscribe()

    return () => {
      supabase.channel("notifications-realtime").unsubscribe()
    }
  }, [fetchNotifications])

  async function markAsRead(notifId: string) {
    const supabase = createClient()
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notifId)

    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function markAllAsRead() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  function handleNotificationClick(notif: Notification) {
    markAsRead(notif.id)
    // Navigate based on notification data
    const data = notif.data
    if (data?.lead_id) {
      router.push(`/berater/leads/${data.lead_id}`)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Benachrichtigungen">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span aria-live="polite" className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Benachrichtigungen</span>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
              className="flex items-center gap-1 text-xs font-normal text-blue-600 hover:text-blue-800"
            >
              <Check className="h-3 w-3" />
              Alle als gelesen markieren
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Keine Benachrichtigungen
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = typeIconMap[notif.type] ?? Bell
            return (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="flex cursor-pointer items-start gap-3 p-3"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    notif.is_read ? "bg-gray-100" : "bg-blue-100"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      notif.is_read ? "text-gray-500" : "text-blue-600"
                    }`}
                  />
                </div>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  <p
                    className={`truncate text-sm ${
                      notif.is_read ? "font-normal" : "font-semibold"
                    }`}
                  >
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="truncate text-xs text-muted-foreground">
                      {notif.body}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(notif.created_at)}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
