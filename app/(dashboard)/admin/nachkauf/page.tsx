"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatEuro } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import type { Database } from "@/types/database"

type NachkaufPaket = Database["public"]["Tables"]["nachkauf_pakete"]["Row"]

interface NachkaufFormData {
  name: string
  beschreibung: string
  anzahl_leads: number
  preis_pro_lead: number // Euro
  stripe_price_id: string
}

function NachkaufForm({
  initialData,
  onSubmit,
  isLoading,
}: {
  initialData?: Partial<NachkaufFormData>
  onSubmit: (data: NachkaufFormData) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState<NachkaufFormData>({
    name: initialData?.name ?? "",
    beschreibung: initialData?.beschreibung ?? "",
    anzahl_leads: initialData?.anzahl_leads ?? 5,
    preis_pro_lead: initialData?.preis_pro_lead ?? 0,
    stripe_price_id: initialData?.stripe_price_id ?? "",
  })

  const gesamtpreis = form.anzahl_leads * form.preis_pro_lead

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nk-name">Name</Label>
        <Input
          id="nk-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="z.B. 5er Nachkauf-Paket"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nk-beschreibung">Beschreibung</Label>
        <Textarea
          id="nk-beschreibung"
          value={form.beschreibung}
          onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
          placeholder="Kurze Beschreibung..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nk-anzahl">Anzahl Leads</Label>
          <Input
            id="nk-anzahl"
            type="number"
            min={1}
            value={form.anzahl_leads}
            onChange={(e) =>
              setForm({ ...form, anzahl_leads: parseInt(e.target.value) || 0 })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nk-preis">Preis pro Lead (EUR)</Label>
          <Input
            id="nk-preis"
            type="number"
            min={0}
            step={0.01}
            value={form.preis_pro_lead}
            onChange={(e) =>
              setForm({
                ...form,
                preis_pro_lead: parseFloat(e.target.value) || 0,
              })
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nk-stripe">Stripe Price ID</Label>
        <Input
          id="nk-stripe"
          value={form.stripe_price_id}
          onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
          placeholder="price_..."
        />
      </div>

      <Separator />

      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">Gesamtpreis</p>
        <p className="text-lg font-bold">
          {formatEuro(Math.round(gesamtpreis * 100))}
        </p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Paket aktualisieren" : "Paket erstellen"}
      </Button>
    </form>
  )
}

export default function AdminNachkaufPage() {
  const [pakete, setPakete] = useState<NachkaufPaket[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPaket, setEditingPaket] = useState<NachkaufPaket | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function fetchPakete() {
    setLoading(true)
    const { data, error } = await supabase
      .from("nachkauf_pakete")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("Error fetching nachkauf pakete:", error)
    } else {
      setPakete(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPakete()
  }, [])

  function openCreate() {
    setEditingPaket(null)
    setDialogOpen(true)
  }

  function openEdit(paket: NachkaufPaket) {
    setEditingPaket(paket)
    setDialogOpen(true)
  }

  async function handleSubmit(formData: NachkaufFormData) {
    setSaving(true)

    const payload = {
      name: formData.name,
      anzahl_leads: formData.anzahl_leads,
      preis_pro_lead_cents: Math.round(formData.preis_pro_lead * 100),
      stripe_price_id: formData.stripe_price_id || null,
    }

    if (editingPaket) {
      const { error } = await supabase
        .from("nachkauf_pakete")
        .update(payload)
        .eq("id", editingPaket.id)

      if (error) console.error("Error updating nachkauf paket:", error)
    } else {
      const { error } = await supabase.from("nachkauf_pakete").insert(payload)
      if (error) console.error("Error creating nachkauf paket:", error)
    }

    setSaving(false)
    setDialogOpen(false)
    setEditingPaket(null)
    fetchPakete()
  }

  async function handleToggle(paketId: string, currentAktiv: boolean) {
    const { error } = await supabase
      .from("nachkauf_pakete")
      .update({ is_active: !currentAktiv })
      .eq("id", paketId)

    if (error) console.error("Error toggling nachkauf paket:", error)
    fetchPakete()
  }

  const initialFormData = editingPaket
    ? {
        name: editingPaket.name,
        beschreibung: "",
        anzahl_leads: editingPaket.anzahl_leads,
        preis_pro_lead: editingPaket.preis_pro_lead_cents / 100,
        stripe_price_id: editingPaket.stripe_price_id ?? "",
      }
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nachkauf-Pakete
          </h1>
          <p className="text-muted-foreground">
            Einmalkauf-Pakete fuer zusaetzliche Leads.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Neues Paket
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPaket
                  ? "Nachkauf-Paket bearbeiten"
                  : "Neues Nachkauf-Paket"}
              </DialogTitle>
            </DialogHeader>
            <NachkaufForm
              key={editingPaket?.id ?? "new"}
              initialData={initialFormData}
              onSubmit={handleSubmit}
              isLoading={saving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Preis/Lead</TableHead>
                  <TableHead>Gesamtpreis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pakete.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Keine Nachkauf-Pakete vorhanden.
                    </TableCell>
                  </TableRow>
                ) : (
                  pakete.map((paket) => (
                    <TableRow
                      key={paket.id}
                      className={cn(!paket.is_active && "opacity-50")}
                    >
                      <TableCell className="font-medium">
                        {paket.name}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {"-"}
                      </TableCell>
                      <TableCell>{paket.anzahl_leads}</TableCell>
                      <TableCell>
                        {formatEuro(paket.preis_pro_lead_cents)}
                      </TableCell>
                      <TableCell>{formatEuro(paket.gesamtpreis_cents)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            paket.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {paket.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                        {paket.stripe_price_id ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(paket)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleToggle(paket.id, paket.is_active)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
