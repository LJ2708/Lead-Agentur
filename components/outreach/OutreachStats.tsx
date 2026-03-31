"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageCircle, Star, Calendar, Trophy, TrendingUp } from "lucide-react";
import type { Tables } from "@/types/database";

type Prospect = Tables<"outreach_prospects">;

interface OutreachStatsProps {
  prospects: Prospect[];
}

export function OutreachStats({ prospects }: OutreachStatsProps) {
  const total = prospects.length;
  const kontaktiert = prospects.filter((p) => p.contact_count > 0).length;
  const interessiert = prospects.filter((p) => p.status === "interessiert").length;
  const demos = prospects.filter(
    (p) => p.status === "demo_vereinbart" || p.status === "demo_durchgefuehrt"
  ).length;
  const gewonnen = prospects.filter((p) => p.status === "gewonnen").length;
  const responseRate =
    kontaktiert > 0
      ? Math.round((interessiert / kontaktiert) * 100)
      : 0;

  const stats = [
    {
      label: "Prospects gesamt",
      value: total,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Kontaktiert",
      value: `${kontaktiert} (${total > 0 ? Math.round((kontaktiert / total) * 100) : 0}%)`,
      icon: MessageCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Interessiert",
      value: `${interessiert} (${total > 0 ? Math.round((interessiert / total) * 100) : 0}%)`,
      icon: Star,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Demos",
      value: demos,
      icon: Calendar,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Gewonnen",
      value: gewonnen,
      icon: Trophy,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Response Rate",
      value: `${responseRate}%`,
      icon: TrendingUp,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
