import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    direction: "up" | "down" | "neutral";
    percentage: number;
  };
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-0">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </span>
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
            {trend && (
              <div
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  trend.direction === "up" && "text-emerald-600",
                  trend.direction === "down" && "text-red-600",
                  trend.direction === "neutral" && "text-muted-foreground"
                )}
              >
                {trend.direction === "up" && (
                  <TrendingUp className="h-3.5 w-3.5" />
                )}
                {trend.direction === "down" && (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {trend.direction === "neutral" && (
                  <Minus className="h-3.5 w-3.5" />
                )}
                <span>
                  {trend.direction === "up" ? "+" : ""}
                  {trend.percentage}%
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
