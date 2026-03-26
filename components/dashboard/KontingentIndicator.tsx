"use client";

import { cn } from "@/lib/utils";

interface KontingentIndicatorProps {
  geliefert: number;
  kontingent: number;
  nachkaufOffen?: number;
}

export function KontingentIndicator({
  geliefert,
  kontingent,
  nachkaufOffen,
}: KontingentIndicatorProps) {
  const prozent = kontingent > 0 ? Math.min((geliefert / kontingent) * 100, 100) : 0;

  const barColor =
    prozent >= 100
      ? "bg-blue-500"
      : prozent >= 70
        ? "bg-emerald-500"
        : prozent >= 40
          ? "bg-yellow-500"
          : "bg-red-500";

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight">
          {geliefert}{" "}
          <span className="text-base font-normal text-muted-foreground">
            / {kontingent} Leads
          </span>
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {Math.round(prozent)}%
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${prozent}%` }}
        />
      </div>

      {nachkaufOffen != null && nachkaufOffen > 0 && (
        <p className="text-xs text-muted-foreground">
          + {nachkaufOffen} Nachkauf-Leads offen
        </p>
      )}
    </div>
  );
}
