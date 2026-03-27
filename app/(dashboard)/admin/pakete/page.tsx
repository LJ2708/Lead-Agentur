"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { PaketForm, type PaketFormData } from "@/components/forms/PaketForm"
import { formatEuro } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/types/database"

type Paket = Database["public"]["Tables"]["lead_pakete"]["Row"]

export default function AdminPaketePage() {
  const [pakete, setPakete] = useState<Paket[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPaket, setEditingPaket] = useState<Paket | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function fetchPakete() {
    setLoading(true)
    const { data, error } = await supabase
      .from("lead_pakete")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("Error fetching pakete:", error)
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

  function openEdit(paket: Paket) {
    setEditingPaket(paket)
    setDialogOpen(true)
  }

  async function handleSubmit(formData: PaketFormData) {
    setSaving(true)

    const payload = {
      name: formData.name,
      beschreibung: formData.beschreibung || null,
      leads_pro_monat: formData.leads_pro_monat,
      preis_pro_lead_cents: Math.round(formData.preis_pro_lead * 100),
      mindestlaufzeit_monate: formData.mindestlaufzeit_monate,
      setter_aufpreis_cents: Math.round(formData.setter_aufpreis * 100),
      stripe_price_id: formData.stripe_price_id || null,
      stripe_price_id_mit_setter: formData.stripe_price_id_mit_setter || null,
    }

    if (editingPaket) {
      const { error } = await supabase
        .from("lead_pakete")
        .update(payload)
        .eq("id", editingPaket.id)

      if (error) {
        console.error("Error updating paket:", error)
        toast.error("Fehler beim Aktualisieren des Pakets.")
      } else {
        toast.success("Paket erfolgreich aktualisiert.")
      }
    } else {
      const { error } = await supabase.from("lead_pakete").insert(payload)

      if (error) {
        console.error("Error creating paket:", error)
        toast.error("Fehler beim Erstellen des Pakets.")
      } else {
        toast.success("Paket erfolgreich erstellt.")
      }
    }

    setSaving(false)
    setDialogOpen(false)
    setEditingPaket(null)
    fetchPakete()
  }

  async function handleDeactivate(paketId: string, currentAktiv: boolean) {
    const { error } = await supabase
      .from("lead_pakete")
      .update({ is_active: !currentAktiv })
      .eq("id", paketId)

    if (error) {
      console.error("Error toggling paket:", error)
      toast.error("Fehler beim Ändern des Paket-Status.")
    } else {
      toast.success(
        currentAktiv ? "Paket deaktiviert." : "Paket aktiviert."
      )
    }

    fetchPakete()
  }

  const initialFormData = editingPaket
    ? {
        name: editingPaket.name,
        beschreibung: editingPaket.beschreibung ?? "",
        leads_pro_monat: editingPaket.leads_pro_monat,
        preis_pro_lead: editingPaket.preis_pro_lead_cents / 100,
        mindestlaufzeit_monate: editingPaket.mindestlaufzeit_monate,
        setter_aufpreis: editingPaket.setter_aufpreis_cents / 100,
        stripe_price_id: editingPaket.stripe_price_id ?? "",
        stripe_price_id_mit_setter: editingPaket.stripe_price_id_mit_setter ?? "",
      }
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead-Pakete</h1>
          <p className="text-muted-foreground">
            Abo-Pakete erstellen und verwalten.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Neues Paket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPaket ? "Paket bearbeiten" : "Neues Paket erstellen"}
              </DialogTitle>
            </DialogHeader>
            <PaketForm
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
                  <TableHead>Leads/Monat</TableHead>
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
                      Keine Pakete vorhanden.
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
                        {paket.beschreibung ?? "-"}
                      </TableCell>
                      <TableCell>{paket.leads_pro_monat}</TableCell>
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
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(paket)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              handleDeactivate(paket.id, paket.is_active)
                            }
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
