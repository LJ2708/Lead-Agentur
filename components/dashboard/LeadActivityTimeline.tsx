"use client";

import {
  RefreshCw,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  UserPlus,
  UserMinus,
  Calendar,
  Settings,
  XCircle,
  ShoppingCart,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Tables } from "@/types/database";
import type { LucideIcon } from "lucide-react";

type Activity = Tables<"lead_activities"> & {
  created_by_name?: string | null;
};

interface LeadActivityTimelineProps {
  activities: Activity[];
}

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  status_change: RefreshCw,
  anruf: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  notiz: FileText,
  zuweisung: UserPlus,
  rueckvergabe: UserMinus,
  termin_gebucht: Calendar,
  termin_abgesagt: XCircle,
  nachkauf: ShoppingCart,
  system: Settings,
};

const ACTIVITY_COLORS: Record<string, string> = {
  status_change: "bg-blue-100 text-blue-600",
  anruf: "bg-green-100 text-green-600",
  email: "bg-purple-100 text-purple-600",
  whatsapp: "bg-emerald-100 text-emerald-600",
  notiz: "bg-amber-100 text-amber-600",
  zuweisung: "bg-indigo-100 text-indigo-600",
  rueckvergabe: "bg-rose-100 text-rose-600",
  termin_gebucht: "bg-cyan-100 text-cyan-600",
  termin_abgesagt: "bg-red-100 text-red-600",
  nachkauf: "bg-teal-100 text-teal-600",
  system: "bg-gray-100 text-gray-600",
};

const ACTIVITY_LABELS: Record<string, string> = {
  status_change: "Status geändert",
  anruf: "Anruf",
  email: "E-Mail",
  whatsapp: "WhatsApp",
  notiz: "Notiz",
  zuweisung: "Zuweisung",
  rueckvergabe: "Rückvergabe",
  termin_gebucht: "Termin gebucht",
  termin_abgesagt: "Termin abgesagt",
  nachkauf: "Nachkauf",
  system: "System",
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return `${formatDate(dateStr)}, ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function LeadActivityTimeline({ activities }: LeadActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Noch keine Aktivitaeten vorhanden.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical timeline line */}
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.type] ?? Settings;
        const iconColor =
          ACTIVITY_COLORS[activity.type] ?? "bg-gray-100 text-gray-600";
        const label = ACTIVITY_LABELS[activity.type] ?? activity.type;

        return (
          <div key={activity.id} className="relative flex gap-3 pb-4">
            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                iconColor
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{label}</p>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatTimestamp(activity.created_at)}
                </time>
              </div>

              {activity.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {activity.description}
                </p>
              )}

              {activity.created_by_name && (
                <p className="mt-1 text-xs text-muted-foreground">
                  von {activity.created_by_name}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
