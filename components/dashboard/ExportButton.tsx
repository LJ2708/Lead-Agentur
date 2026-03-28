"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExportButtonProps {
  filters?: {
    status?: string
    dateFrom?: string
    dateTo?: string
  }
}

export function ExportButton({ filters }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (filters?.status && filters.status !== "alle") {
        params.set("status", filters.status)
      }
      if (filters?.dateFrom) {
        params.set("from", filters.dateFrom)
      }
      if (filters?.dateTo) {
        params.set("to", filters.dateTo)
      }

      const url = `/api/leads/export${params.toString() ? `?${params.toString()}` : ""}`

      const res = await fetch(url)

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || "Export fehlgeschlagen")
      }

      // Trigger download
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition")
      const filenameMatch = disposition?.match(/filename=(.+)/)
      link.download = filenameMatch?.[1] || `leads-export-${new Date().toISOString().slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      toast.success("Export erfolgreich heruntergeladen")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1 h-4 w-4" />
      )}
      Exportieren
    </Button>
  )
}
