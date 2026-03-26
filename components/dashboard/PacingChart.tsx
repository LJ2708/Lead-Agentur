"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { berechnePacingInfo } from "@/lib/routing/pacing";

interface PacingChartProps {
  kontingent: number;
  geliefert: number;
}

export function PacingChart({ kontingent, geliefert }: PacingChartProps) {
  const pacing = berechnePacingInfo(kontingent, geliefert);

  const data = [
    {
      name: "Soll (bis heute)",
      wert: pacing.sollBisJetzt,
    },
    {
      name: "Ist (geliefert)",
      wert: pacing.geliefert,
    },
    {
      name: "Kontingent (gesamt)",
      wert: pacing.kontingent,
    },
  ];

  const barColors = ["#94a3b8", getStatusBarColor(pacing.status), "#e2e8f0"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Pacing: Soll vs. Ist
        </h3>
        <PacingStatusBadge status={pacing.status} differenz={pacing.differenz} />
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={((value: number) => [`${value} Leads`, ""]) as any}
            labelStyle={{ fontWeight: 600 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <ReferenceLine
            y={pacing.sollBisJetzt}
            stroke="#64748b"
            strokeDasharray="4 4"
            label={{
              value: `Soll: ${pacing.sollBisJetzt}`,
              position: "right",
              fontSize: 11,
              fill: "#64748b",
            }}
          />
          <Bar dataKey="wert" radius={[6, 6, 0, 0]} maxBarSize={60}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={barColors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function getStatusBarColor(status: string): string {
  switch (status) {
    case "ahead":
      return "#3b82f6";
    case "on_track":
      return "#22c55e";
    case "behind":
      return "#eab308";
    default:
      return "#94a3b8";
  }
}

function PacingStatusBadge({
  status,
  differenz,
}: {
  status: string;
  differenz: number;
}) {
  const label =
    status === "ahead"
      ? "Voraus"
      : status === "on_track"
        ? "Im Plan"
        : "Hinterher";

  const color =
    status === "ahead"
      ? "bg-blue-100 text-blue-800"
      : status === "on_track"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-yellow-100 text-yellow-800";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
      {differenz !== 0 && (
        <span className="opacity-75">
          ({differenz > 0 ? `-${differenz}` : `+${Math.abs(differenz)}`})
        </span>
      )}
    </span>
  );
}
