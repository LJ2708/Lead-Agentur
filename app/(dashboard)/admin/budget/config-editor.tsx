"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Settings } from "lucide-react"

export function BudgetConfigEditor() {
  const router = useRouter()
  const [metaCpl, setMetaCpl] = useState("25.00")
  const [agenturKosten, setAgenturKosten] = useState("0")
  const [setterKosten, setSetterKosten] = useState("15.00")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    // In a production implementation, this would save to a system config table
    // or call an API endpoint to persist these budget calculation parameters.
    // For now, we trigger a page refresh to recalculate with defaults.
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSaving(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          Budget-Konfiguration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="meta-cpl">Meta CPL (EUR)</Label>
            <Input
              id="meta-cpl"
              type="number"
              min={0}
              step={0.01}
              value={metaCpl}
              onChange={(e) => setMetaCpl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Durchschnittliche Kosten pro Lead über Meta Ads
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentur-kosten">Agenturkosten (%)</Label>
            <Input
              id="agentur-kosten"
              type="number"
              min={0}
              max={100}
              step={1}
              value={agenturKosten}
              onChange={(e) => setAgenturKosten(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Agentur-Fee als Prozentsatz des Umsatzes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setter-kosten">Setter-Kosten/Lead (EUR)</Label>
            <Input
              id="setter-kosten"
              type="number"
              min={0}
              step={0.01}
              value={setterKosten}
              onChange={(e) => setSetterKosten(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Interne Kosten pro Lead für Setter
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Konfiguration speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
