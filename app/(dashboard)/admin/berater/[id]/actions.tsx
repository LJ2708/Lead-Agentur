"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pause, Play, Settings, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/types/database"

interface BeraterDetailActionsProps {
  beraterId: string
  currentStatus: string
}

export function BeraterDetailActions({
  beraterId,
  currentStatus,
}: BeraterDetailActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [paketDialogOpen, setPaketDialogOpen] = useState(false)

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

  async function handleStatusChange(newStatus: string) {
    setLoading(true)
    const { error } = await supabase
      .from("berater")
      .update({
        status: newStatus as Database["public"]["Enums"]["berater_status"],
        ...(newStatus === "pausiert" ? { pausiert_seit: new Date().toISOString() } : {}),
        ...(newStatus === "aktiv" ? { pausiert_seit: null } : {}),
      })
      .eq("id", beraterId)

    if (error) {
      console.error("Error updating status:", error)
      toast.error("Fehler beim Aktualisieren des Status.")
    } else {
      toast.success(
        `Berater-Status auf "${STATUS_LABELS[newStatus] ?? newStatus}" gesetzt.`
      )
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {currentStatus === "aktiv" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatusChange("pausiert")}
          disabled={loading}
        >
          {loading ? (
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
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Play className="mr-1 h-3 w-3" />
          )}
          Aktivieren
        </Button>
      )}

      {currentStatus !== "inaktiv" && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleStatusChange("inaktiv")}
          disabled={loading}
        >
          Deaktivieren
        </Button>
      )}

      <Dialog open={paketDialogOpen} onOpenChange={setPaketDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="mr-1 h-3 w-3" />
            Paket ändern
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paket ändern</DialogTitle>
            <DialogDescription>
              Änderungen am Paket werden erst nach dem nächsten
              Abrechnungszeitraum wirksam.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Paket-Änderungen müssen über Stripe vorgenommen werden.
              Navigieren Sie zum Stripe-Dashboard, um die Subscription zu
              aktualisieren.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaketDialogOpen(false)}
            >
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
