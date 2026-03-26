"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatEuro } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface PaketFormData {
  name: string
  beschreibung: string
  leads_pro_monat: number
  preis_pro_lead: number // Euro (float)
  mindestlaufzeit_monate: number
  setter_aufpreis: number // Euro (float)
  stripe_price_id: string
  stripe_price_id_mit_setter: string
}

interface PaketFormProps {
  initialData?: Partial<PaketFormData>
  onSubmit: (data: PaketFormData) => void
  isLoading: boolean
}

export function PaketForm({ initialData, onSubmit, isLoading }: PaketFormProps) {
  const [form, setForm] = useState<PaketFormData>({
    name: initialData?.name ?? "",
    beschreibung: initialData?.beschreibung ?? "",
    leads_pro_monat: initialData?.leads_pro_monat ?? 10,
    preis_pro_lead: initialData?.preis_pro_lead ?? 0,
    mindestlaufzeit_monate: initialData?.mindestlaufzeit_monate ?? 3,
    setter_aufpreis: initialData?.setter_aufpreis ?? 0,
    stripe_price_id: initialData?.stripe_price_id ?? "",
    stripe_price_id_mit_setter: initialData?.stripe_price_id_mit_setter ?? "",
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name ?? "",
        beschreibung: initialData.beschreibung ?? "",
        leads_pro_monat: initialData.leads_pro_monat ?? 10,
        preis_pro_lead: initialData.preis_pro_lead ?? 0,
        mindestlaufzeit_monate: initialData.mindestlaufzeit_monate ?? 3,
        setter_aufpreis: initialData.setter_aufpreis ?? 0,
        stripe_price_id: initialData.stripe_price_id ?? "",
        stripe_price_id_mit_setter: initialData.stripe_price_id_mit_setter ?? "",
      })
    }
  }, [initialData])

  const gesamtpreisOhneSetter = form.leads_pro_monat * form.preis_pro_lead
  const gesamtpreisMitSetter =
    form.leads_pro_monat * (form.preis_pro_lead + form.setter_aufpreis)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  function updateField<K extends keyof PaketFormData>(
    key: K,
    value: PaketFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="paket-name">Name</Label>
        <Input
          id="paket-name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="z.B. Starter-Paket"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paket-beschreibung">Beschreibung</Label>
        <Textarea
          id="paket-beschreibung"
          value={form.beschreibung}
          onChange={(e) => updateField("beschreibung", e.target.value)}
          placeholder="Kurze Beschreibung des Pakets..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paket-leads">Leads pro Monat</Label>
          <Input
            id="paket-leads"
            type="number"
            min={1}
            value={form.leads_pro_monat}
            onChange={(e) =>
              updateField("leads_pro_monat", parseInt(e.target.value) || 0)
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paket-preis">Preis pro Lead (EUR)</Label>
          <Input
            id="paket-preis"
            type="number"
            min={0}
            step={0.01}
            value={form.preis_pro_lead}
            onChange={(e) =>
              updateField("preis_pro_lead", parseFloat(e.target.value) || 0)
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paket-laufzeit">Mindestlaufzeit (Monate)</Label>
          <Input
            id="paket-laufzeit"
            type="number"
            min={1}
            value={form.mindestlaufzeit_monate}
            onChange={(e) =>
              updateField(
                "mindestlaufzeit_monate",
                parseInt(e.target.value) || 0
              )
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paket-setter">Setter-Aufpreis (EUR)</Label>
          <Input
            id="paket-setter"
            type="number"
            min={0}
            step={0.01}
            value={form.setter_aufpreis}
            onChange={(e) =>
              updateField("setter_aufpreis", parseFloat(e.target.value) || 0)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paket-stripe">Stripe Price ID</Label>
        <Input
          id="paket-stripe"
          value={form.stripe_price_id}
          onChange={(e) => updateField("stripe_price_id", e.target.value)}
          placeholder="price_..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paket-stripe-setter">
          Stripe Price ID (mit Setter)
        </Label>
        <Input
          id="paket-stripe-setter"
          value={form.stripe_price_id_mit_setter}
          onChange={(e) =>
            updateField("stripe_price_id_mit_setter", e.target.value)
          }
          placeholder="price_..."
        />
      </div>

      <Separator />

      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium text-muted-foreground">
          Berechneter Gesamtpreis
        </p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Ohne Setter</p>
            <p className="text-lg font-bold">
              {formatEuro(Math.round(gesamtpreisOhneSetter * 100))}/Monat
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mit Setter</p>
            <p className="text-lg font-bold">
              {formatEuro(Math.round(gesamtpreisMitSetter * 100))}/Monat
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Paket aktualisieren" : "Paket erstellen"}
      </Button>
    </form>
  )
}
