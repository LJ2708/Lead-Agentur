"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatEuro } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  Target,
} from "lucide-react"

export interface BudgetData {
  einnahmen: {
    abo: number
    nachkauf: number
    setter: number
    gesamt: number
  }
  zuLiefern: {
    abo: number
    nachkauf: number
    gesamt: number
  }
  kosten: {
    meta: number
    agentur: number
    setter: number
    gesamt: number
  }
  deckungsbeitrag: number
  marge: number
  setterMarge?: number
  benoetigtesMETABudget: number
  lieferstatus: {
    geliefert: number
    offen: number
    prozent: number
  }
}

interface BudgetDashboardProps {
  budget: BudgetData
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function LineItem({
  label,
  value,
  isBold = false,
  isHighlight = false,
}: {
  label: string
  value: string
  isBold?: boolean
  isHighlight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        isBold && "font-semibold",
        isHighlight && "text-blue-600"
      )}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm", isBold && "text-base font-bold")}>
        {value}
      </span>
    </div>
  )
}

export function BudgetDashboard({ budget }: BudgetDashboardProps) {
  const margePositive = budget.marge >= 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* EINNAHMEN */}
        <SectionCard title="Einnahmen" icon={DollarSign}>
          <LineItem label="Abo-Umsatz" value={formatEuro(budget.einnahmen.abo)} />
          <LineItem
            label="Nachkauf-Umsatz"
            value={formatEuro(budget.einnahmen.nachkauf)}
          />
          <LineItem
            label="Setter-Addon-Umsatz"
            value={formatEuro(budget.einnahmen.setter)}
          />
          <Separator />
          <LineItem
            label="Gesamt"
            value={formatEuro(budget.einnahmen.gesamt)}
            isBold
          />
        </SectionCard>

        {/* ZU LIEFERN */}
        <SectionCard title="Zu liefern" icon={Package}>
          <LineItem
            label="Abo-Leads"
            value={`${budget.zuLiefern.abo} Leads`}
          />
          <LineItem
            label="Nachkauf"
            value={`${budget.zuLiefern.nachkauf} Leads`}
          />
          <Separator />
          <LineItem
            label="Gesamt"
            value={`${budget.zuLiefern.gesamt} Leads`}
            isBold
          />
        </SectionCard>

        {/* KOSTEN */}
        <SectionCard title="Kosten" icon={BarChart3}>
          <LineItem label="Meta Ad Spend" value={formatEuro(budget.kosten.meta)} />
          <LineItem label="Agentur" value={formatEuro(budget.kosten.agentur)} />
          <LineItem label="Setter intern" value={formatEuro(budget.kosten.setter)} />
          <Separator />
          <LineItem
            label="Gesamt"
            value={formatEuro(budget.kosten.gesamt)}
            isBold
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* DECKUNGSBEITRAG + MARGE */}
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deckungsbeitrag</p>
                <p className="text-2xl font-bold">
                  {formatEuro(budget.deckungsbeitrag)}
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
                  margePositive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {margePositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {budget.marge.toFixed(1)}% Marge
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SETTER-MARGE */}
        {budget.setterMarge !== undefined && budget.setterMarge !== 0 && (
          <Card>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Setter-Marge</p>
              <p className="text-2xl font-bold">
                {formatEuro(budget.setterMarge)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aufpreis abzgl. Vergütung pro Setter-Lead
              </p>
            </CardContent>
          </Card>
        )}

        {/* BENOETIGTES META-BUDGET */}
        <Card>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Benötigtes META-Budget
            </p>
            <p className="text-2xl font-bold">
              {formatEuro(budget.benoetigtesMETABudget)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Basierend auf {budget.zuLiefern.gesamt} Leads zu liefern
            </p>
          </CardContent>
        </Card>

        {/* LIEFERSTATUS */}
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Lieferstatus</p>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-2xl font-bold">
                {budget.lieferstatus.geliefert}
              </p>
              <p className="mb-0.5 text-sm text-muted-foreground">
                / {budget.lieferstatus.geliefert + budget.lieferstatus.offen}{" "}
                Leads
              </p>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fortschritt</span>
                <span>{budget.lieferstatus.prozent}%</span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    budget.lieferstatus.prozent >= 80
                      ? "bg-emerald-500"
                      : budget.lieferstatus.prozent >= 50
                        ? "bg-blue-500"
                        : budget.lieferstatus.prozent >= 25
                          ? "bg-yellow-500"
                          : "bg-red-500"
                  )}
                  style={{
                    width: `${Math.min(100, budget.lieferstatus.prozent)}%`,
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {budget.lieferstatus.offen} Leads offen
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
