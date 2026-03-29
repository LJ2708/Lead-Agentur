"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileDown, Loader2, Printer, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

interface ReportExportButtonProps {
  period: "7d" | "30d" | "90d"
}

export function ReportExportButton({ period }: ReportExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleCsvExport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/export?period=${period}&format=csv`)
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? "Export fehlgeschlagen")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${period}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Bericht exportiert")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Export fehlgeschlagen"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Bericht exportieren
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsvExport} disabled={loading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Als CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Drucken
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
