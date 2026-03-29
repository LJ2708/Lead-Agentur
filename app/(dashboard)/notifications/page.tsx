"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { cn } from "@/lib/utils";
import {
  Bell,
  Zap,
  AlertTriangle,
  AlertOctagon,
  ArrowRightLeft,
  CalendarDays,
  TrendingUp,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
  urgency: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

type FilterTab = "alle" | "ungelesen" | "leads" | "sla" | "system";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const typeIconMap: Record<string, LucideIcon> = {
  new_lead: Zap,
  sla_warning: AlertTriangle,
  sla_breach: AlertOctagon,
  lead_reassigned: ArrowRightLeft,
  appointment_reminder: CalendarDays,
  performance_update: TrendingUp,
  system: Settings,
};

const typeColorMap: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-600",
  sla_warning: "bg-amber-100 text-amber-600",
  sla_breach: "bg-red-100 text-red-600",
  lead_reassigned: "bg-purple-100 text-purple-600",
  appointment_reminder: "bg-cyan-100 text-cyan-600",
  performance_update: "bg-green-100 text-green-600",
  system: "bg-gray-100 text-gray-600",
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "ungelesen", label: "Ungelesen" },
  { key: "leads", label: "Leads" },
  { key: "sla", label: "SLA" },
  { key: "system", label: "System" },
];

const LEAD_TYPES = new Set(["new_lead", "lead_reassigned"]);
const SLA_TYPES = new Set(["sla_warning", "sla_breach"]);
const SYSTEM_TYPES = new Set(["system", "performance_update", "appointment_reminder"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Gerade eben";
  if (mins < 60) return `Vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Vor ${days} Tag${days > 1 ? "en" : ""}`;
  const months = Math.floor(days / 30);
  return `Vor ${months} Monat${months > 1 ? "en" : ""}`;
}

function getNavigationPath(notif: Notification): string | null {
  const data = notif.data;
  if (data?.lead_id) return `/berater/leads/${data.lead_id}`;
  if (data?.berater_id) return `/admin/berater/${data.berater_id}`;
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("alle");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchNotifications = useCallback(
    async (currentPage: number, tab: FilterTab) => {
      setLoading(true);
      const sb = createClient();

      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      let query = sb
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (tab === "ungelesen") {
        query = query.eq("is_read", false);
      } else if (tab === "leads") {
        query = query.in("type", Array.from(LEAD_TYPES));
      } else if (tab === "sla") {
        query = query.in("type", Array.from(SLA_TYPES));
      } else if (tab === "system") {
        query = query.in("type", Array.from(SYSTEM_TYPES));
      }

      const { data, count } = await query;

      setNotifications((data as unknown as Notification[]) ?? []);
      setTotalCount(count ?? 0);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    fetchNotifications(page, activeTab);
  }, [page, activeTab, fetchNotifications]);

  // Realtime: new notifications appear at top with animation
  useEffect(() => {
    const sb = createClient();
    let currentUserId: string | null = null;

    async function subscribe() {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;
      currentUserId = user.id;

      sb.channel("notifications-page-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            const newNotif = payload.new as unknown as Notification;
            if (page === 0) {
              setNotifications((prev) => [newNotif, ...prev].slice(0, PAGE_SIZE));
              setTotalCount((prev) => prev + 1);
            }
          }
        )
        .subscribe();
    }

    subscribe();

    return () => {
      sb.channel("notifications-page-realtime").unsubscribe();
    };
  }, [page]);

  async function markAsRead(notifId: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notifId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
  }

  async function handleNotificationClick(notif: Notification) {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    const path = getNavigationPath(notif);
    if (path) {
      router.push(path);
    }
  }

  async function markAllAsRead() {
    if (!userId) return;
    setMarkingAll(true);

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    setMarkingAll(false);
  }

  async function deleteOldNotifications() {
    if (!userId) return;
    setDeleting(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .lt("created_at", thirtyDaysAgo.toISOString());

    await fetchNotifications(0, activeTab);
    setPage(0);
    setDeleting(false);
  }

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    setPage(0);
  }

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benachrichtigungen"
        description="Alle Ihre Benachrichtigungen an einem Ort"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          disabled={markingAll || !hasUnread}
        >
          {markingAll ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Alle als gelesen markieren
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={deleteOldNotifications}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Alte löschen (30+ Tage)
        </Button>
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div ref={listRef} className="space-y-2">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
              Benachrichtigungen werden geladen...
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Keine Benachrichtigungen"
            description={
              activeTab === "ungelesen"
                ? "Sie haben keine ungelesenen Benachrichtigungen."
                : "Es sind noch keine Benachrichtigungen vorhanden."
            }
          />
        ) : (
          <>
            {notifications.map((notif, index) => {
              const Icon = typeIconMap[notif.type] ?? Bell;
              const iconColor =
                typeColorMap[notif.type] ?? "bg-gray-100 text-gray-600";

              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-all hover:shadow-sm",
                    !notif.is_read && "border-blue-200 bg-blue-50/50",
                    notif.is_read && "bg-card",
                    index === 0 && "animate-in fade-in-0 slide-in-from-top-2"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      iconColor
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          notif.is_read ? "font-normal" : "font-semibold"
                        )}
                      >
                        {notif.title}
                      </p>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {formatTimeAgo(notif.created_at)}
                      </time>
                    </div>
                    {notif.body && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                  </div>
                  {!notif.is_read && (
                    <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                  {notif.is_read && (
                    <Check className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                </button>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Seite {page + 1} von {totalPages} ({totalCount}{" "}
                    Benachrichtigungen)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Zurück
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                    >
                      Weiter
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
