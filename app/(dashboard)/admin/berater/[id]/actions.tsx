"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pause, Play, XCircle, Loader2, Save, Settings } from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/types/database"

interface BeraterDetailActionsProps {
  beraterId: string
  currentStatus: string
  currentLeadsProMonat: number
  currentSetterTyp: string
}

export function BeraterDetailActions({
  beraterId,
  currentStatus,
  currentLeadsProMonat,
  currentSetterTyp,
}: BeraterDetailActionsProps) {
  const router = useRouter()
  const [statusLoading, setStatusLoading] = useState(false)
  const [leadsProMonat, setLeadsProMonat] = useState(currentLeadsProMonat)
  const [savingLeads, setSavingLeads] = useState(false)
  const [setterTyp, setSetterTyp] = useState(currentSetterTyp)
  const [savingSetter, setSavingSetter] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const STATUS_LABELS: Record<string, string> = {
    aktiv: "Aktiv",
    pausiert: "Pausiert",
    inaktiv: "Inaktiv",
    pending: "Ausstehend",
  }

  async function getCurrentUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  }

  async function createAuditLog(
    action: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>
  ) {
    const userId = await getCurrentUserId()
    await supabase.from("audit_log").insert({
      user_id: userId,
      entity: "berater",
      entity_id: beraterId,
      action,
      old_value: oldValue as Database["public"]["Tables"]["audit_log"]["Insert"]["old_value"],
      new_value: newValue as Database["public"]["Tables"]["audit_log"]["Insert"]["new_value"],
    })
  }

  async function handleStatusChange(newStatus: string) {
    setStatusLoading(true)
    const { error } = await supabase
      .from("berater")
      .update({
        status: newStatus as Database["public"]["Enums"]["berater_status"],
        ...(newStatus === "pausiert"
          ? { pausiert_seit: new Date().toISOString() }
          : {}),
        ...(newStatus === "aktiv" ? { pausiert_seit: null } : {}),
      })
      .eq("id", beraterId)

    if (error) {
      toast.error("Fehler beim Aktualisieren des Status.")
    } else {
      await createAuditLog(
        "status_change",
        { status: currentStatus },
        { status: newStatus }
      )
      toast.success(
        `Berater-Status auf "${STATUS_LABELS[newStatus] ?? newStatus}" gesetzt.`
      )
    }

    setStatusLoading(false)
    router.refresh()
  }

  async function handleSaveLeadsProMonat() {
    if (leadsProMonat < 10 || leadsProMonat > 50) {
      toast.error("Leads pro Monat muss zwischen 10 und 50 liegen.")
      return
    }

    setSavingLeads(true)
    const { error } = await supabase
      .from("berater")
      .update({ leads_pro_monat: leadsProMonat })
      .eq("id", beraterId)

    if (error) {
      toast.error("Fehler beim Speichern.")
    } else {
      await createAuditLog(
        "leads_pro_monat_change",
        { leads_pro_monat: currentLeadsProMonat },
        { leads_pro_monat: leadsProMonat }
      )
      toast.success(`Leads pro Monat auf ${leadsProMonat} gesetzt.`)
    }

    setSavingLeads(false)
    router.refresh()
  }

  async function handleSaveSetterTyp() {
    setSavingSetter(true)
    const { error } = await supabase
      .from("berater")
      .update({
        setter_typ: setterTyp,
        hat_setter: setterTyp !== "keiner",
      })
      .eq("id", beraterId)

    if (error) {
      toast.error("Fehler beim Speichern.")
    } else {
      const labels: Record<string, string> = {
        keiner: "Kein Setter",
        pool: "LeadSolution Setter",
        eigen: "Eigener Setter",
      }
      await createAuditLog(
        "setter_typ_change",
        { setter_typ: currentSetterTyp },
        { setter_typ: setterTyp }
      )
      toast.success(`Setter-Typ auf "${labels[setterTyp] ?? setterTyp}" gesetzt.`)
    }

    setSavingSetter(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          Aktionen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Status Actions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              {currentStatus === "aktiv" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("pausiert")}
                  disabled={statusLoading}
                >
                  {statusLoading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Pause className="mr-1 h-3 w-3" />
                  )}
                  Pausieren
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("aktiv")}
                  disabled={statusLoading}
                >
                  {statusLoading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3 w-3" />
                  )}
                  Aktivieren
                </Button>
              )}

              {currentStatus !== "inaktiv" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={statusLoading}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Deaktivieren
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Berater deaktivieren?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Der Berater erhaelt keine neuen Leads mehr und kann sich
                        nicht mehr anmelden. Diese Aktion kann rueckgaengig
                        gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleStatusChange("inaktiv")}
                      >
                        Deaktivieren
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Leads pro Monat */}
          <div className="space-y-3">
            <Label htmlFor="leads-pro-monat" className="text-sm font-medium">
              Leads pro Monat
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="leads-pro-monat"
                type="number"
                min={10}
                max={50}
                value={leadsProMonat}
                onChange={(e) => setLeadsProMonat(Number(e.target.value))}
                className="w-24"
              />
              <Button
                size="sm"
                onClick={handleSaveLeadsProMonat}
                disabled={
                  savingLeads || leadsProMonat === currentLeadsProMonat
                }
              >
                {savingLeads ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                Speichern
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Min. 10, Max. 50</p>
          </div>

          {/* Setter Typ */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Setter-Typ</Label>
            <div className="flex items-center gap-2">
              <Select value={setterTyp} onValueChange={setSetterTyp}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keiner">Kein Setter</SelectItem>
                  <SelectItem value="pool">LeadSolution Setter</SelectItem>
                  <SelectItem value="eigen">Eigener Setter</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleSaveSetterTyp}
                disabled={savingSetter || setterTyp === currentSetterTyp}
              >
                {savingSetter ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
