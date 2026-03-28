import { calculateBudget } from "@/lib/budget/calculator"
import {
  BudgetDashboard,
  type BudgetData,
} from "@/components/dashboard/BudgetDashboard"
import { BudgetConfigEditor } from "./config-editor"
import { BudgetChart } from "./budget-chart"

export default async function AdminBudgetPage() {
  let budget: BudgetData

  try {
    budget = await calculateBudget()
  } catch (error) {
    console.error("Failed to calculate budget:", error)
    budget = {
      einnahmen: { abo: 0, nachkauf: 0, setter: 0, gesamt: 0 },
      zuLiefern: { abo: 0, nachkauf: 0, gesamt: 0 },
      kosten: { meta: 0, agentur: 0, setter: 0, gesamt: 0 },
      deckungsbeitrag: 0,
      marge: 0,
      setterMarge: 0,
      benoetigtesMETABudget: 0,
      lieferstatus: { geliefert: 0, offen: 0, prozent: 0 },
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Budget-Dashboard
        </h1>
        <p className="text-muted-foreground">
          Finanzübersicht für den aktuellen Monat.
        </p>
      </div>

      <BudgetDashboard budget={budget} />

      <BudgetChart budget={budget} />

      <BudgetConfigEditor />
    </div>
  )
}
