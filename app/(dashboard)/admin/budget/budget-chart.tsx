"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BudgetData } from "@/components/dashboard/BudgetDashboard"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface BudgetChartProps {
  budget: BudgetData
}

function centsToEuro(cents: number): number {
  return Math.round(cents / 100)
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function BudgetChart({ budget }: BudgetChartProps) {
  const barData = [
    {
      name: "Einnahmen",
      "Abo-Umsatz": centsToEuro(budget.einnahmen.abo),
      "Nachkauf": centsToEuro(budget.einnahmen.nachkauf),
      "Setter-Addon": centsToEuro(budget.einnahmen.setter),
    },
    {
      name: "Kosten",
      "Meta Ads": centsToEuro(budget.kosten.meta),
      "Agentur": centsToEuro(budget.kosten.agentur),
      "Setter": centsToEuro(budget.kosten.setter),
    },
  ]

  const pieData = [
    { name: "Meta Ads", value: centsToEuro(budget.kosten.meta) },
    { name: "Agentur", value: centsToEuro(budget.kosten.agentur) },
    { name: "Setter", value: centsToEuro(budget.kosten.setter) },
  ].filter((d) => d.value > 0)

  const hasBarData =
    budget.einnahmen.gesamt > 0 || budget.kosten.gesamt > 0
  const hasPieData = pieData.length > 0

  if (!hasBarData && !hasPieData) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Bar Chart: Einnahmen vs Kosten */}
      {hasBarData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Einnahmen vs. Kosten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(v: number) => `${v} \u20AC`}
                />
                <Tooltip
                  formatter={(value) => [`${value} \u20AC`]}
                />
                <Legend />
                <Bar dataKey="Abo-Umsatz" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Nachkauf" stackId="a" fill="#10b981" />
                <Bar dataKey="Setter-Addon" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Meta Ads" stackId="b" fill="#ef4444" />
                <Bar dataKey="Agentur" stackId="b" fill="#8b5cf6" />
                <Bar dataKey="Setter" stackId="b" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart: Kostenaufschlüsselung */}
      {hasPieData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Kostenaufschlüsselung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name ?? ""}: ${value ?? 0} \u20AC`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} \u20AC`]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
