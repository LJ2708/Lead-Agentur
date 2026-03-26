"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2Icon, SaveIcon } from "lucide-react"

export interface NachkaufPaketFormData {
  name: string
  anzahl_leads: number
  preis_pro_lead: number
  setter_aufpreis: number
  stripe_price_id: string
  stripe_price_id_mit_setter: string
}

interface NachkaufPaketFormProps {
  initialData?: Partial<NachkaufPaketFormData>
  onSubmit: (data: NachkaufPaketFormData) => void | Promise<void>
  isLoading: boolean
}

export default function NachkaufPaketForm({
  initialData,
  onSubmit,
  isLoading,
}: NachkaufPaketFormProps) {
  const [name, setName] = useState(initialData?.name ?? "")
  const [anzahlLeads, setAnzahlLeads] = useState(initialData?.anzahl_leads ?? 0)
  const [preisProLead, setPreisProLead] = useState(initialData?.preis_pro_lead ?? 0)
  const [setterAufpreis, setSetterAufpreis] = useState(initialData?.setter_aufpreis ?? 0)
  const [stripePriceId, setStripePriceId] = useState(initialData?.stripe_price_id ?? "")
  const [stripePriceIdMitSetter, setStripePriceIdMitSetter] = useState(
    initialData?.stripe_price_id_mit_setter ?? ""
  )

  const gesamtpreis = useMemo(() => {
    return anzahlLeads * preisProLead
  }, [anzahlLeads, preisProLead])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name,
      anzahl_leads: anzahlLeads,
      preis_pro_lead: preisProLead,
      setter_aufpreis: setterAufpreis,
      stripe_price_id: stripePriceId,
      stripe_price_id_mit_setter: stripePriceIdMitSetter,
    })
  }

  function formatEuro(cents: number): string {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nachkauf-name">Name</Label>
        <Input
          id="nachkauf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. 10er Nachkauf-Paket"
          required
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nachkauf-anzahl">Anzahl Leads</Label>
          <Input
            id="nachkauf-anzahl"
            type="number"
            min={1}
            value={anzahlLeads || ""}
            onChange={(e) => setAnzahlLeads(parseInt(e.target.value) || 0)}
            placeholder="10"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nachkauf-preis">Preis pro Lead (Cent)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="nachkauf-preis"
              type="number"
              min={0}
              value={preisProLead || ""}
              onChange={(e) => setPreisProLead(parseInt(e.target.value) || 0)}
              placeholder="2500"
              required
              disabled={isLoading}
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              = {formatEuro(preisProLead)}/Lead
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nachkauf-setter">Setter-Aufpreis (Cent)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="nachkauf-setter"
            type="number"
            min={0}
            value={setterAufpreis || ""}
            onChange={(e) => setSetterAufpreis(parseInt(e.target.value) || 0)}
            placeholder="500"
            disabled={isLoading}
          />
          <span className="shrink-0 text-sm text-muted-foreground">
            = {formatEuro(setterAufpreis)}/Lead
          </span>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm font-medium">
          Gesamtpreis: {formatEuro(gesamtpreis)}
        </p>
        <p className="text-xs text-muted-foreground">
          {anzahlLeads} Leads x {formatEuro(preisProLead)} pro Lead
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nachkauf-stripe">Stripe Price ID</Label>
          <Input
            id="nachkauf-stripe"
            value={stripePriceId}
            onChange={(e) => setStripePriceId(e.target.value)}
            placeholder="price_..."
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nachkauf-stripe-setter">
            Stripe Price ID (mit Setter)
          </Label>
          <Input
            id="nachkauf-stripe-setter"
            value={stripePriceIdMitSetter}
            onChange={(e) => setStripePriceIdMitSetter(e.target.value)}
            placeholder="price_..."
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
            Speichern...
          </>
        ) : (
          <>
            <SaveIcon className="size-4" data-icon="inline-start" />
            Paket speichern
          </>
        )}
      </Button>
    </form>
  )
}
