"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface ImportSummary {
  berater_created: number
  berater_names: string[]
  setter_created: number
  setter_names: string[]
  leads_imported: number
  leads_skipped: number
  leads_by_status: Record<string, number>
  leads_by_berater: Record<string, number>
  errors: string[]
}

interface ImportResult {
  success: boolean
  summary: ImportSummary
  logs: string[]
}

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  zugewiesen: "Zugewiesen",
  kontaktversuch: "Kontaktversuch",
  nicht_erreicht: "Nicht erreicht",
  qualifiziert: "Qualifiziert",
  termin: "Termin",
  show: "Show",
  no_show: "No-Show",
  nachfassen: "Nachfassen",
  abschluss: "Abschluss",
  verloren: "Verloren",
  warteschlange: "Warteschlange",
}

export default function AdminImportPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImport(mode: "default" | "upload") {
    setLoading(true)
    setError(null)
    setResult(null)
    setLogs([])

    try {
      const cronSecret = prompt(
        "Bitte CRON_SECRET eingeben, um den Import zu autorisieren:"
      )
      if (!cronSecret) {
        setLoading(false)
        return
      }

      let response: Response

      if (mode === "upload" && selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)

        response = await fetch("/api/import/bulk", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
          },
          body: formData,
        })
      } else {
        response = await fetch("/api/import/bulk", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_path:
              "/Users/louisjacob/Downloads/Leadkampagne mitNORM Q4_25 (2).csv",
          }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unbekannter Fehler")
        return
      }

      setResult(data as ImportResult)
      setLogs(data.logs ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler")
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Datenimport</h1>
        <p className="text-muted-foreground mt-1">
          CSV-Daten importieren (Leads und Berater). SILENT MODE: Keine E-Mails,
          keine Benachrichtigungen.
        </p>
      </div>

      {/* Import Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Default File Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Standard-Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importiert die Standard-CSV-Datei vom Server:
            </p>
            <code className="block rounded bg-muted px-3 py-2 text-xs break-all">
              Leadkampagne mitNORM Q4_25 (2).csv
            </code>
            <Button
              onClick={() => handleImport("default")}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Live-Daten importieren
            </Button>
          </CardContent>
        </Card>

        {/* File Upload Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSV hochladen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Eigene CSV-Datei hochladen und importieren:
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                Ausgewaehlt: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <Button
              onClick={() => handleImport("upload")}
              disabled={loading || !selectedFile}
              className="w-full"
              size="lg"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              CSV importieren
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Import fehlgeschlagen</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Logs */}
      {loading && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fortschritt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto rounded bg-muted p-3 text-xs font-mono space-y-0.5">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Summary */}
      {result && (
        <div className="space-y-4">
          {/* Success Header */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-start gap-3 pt-6">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">
                  Import erfolgreich abgeschlossen
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {result.summary.leads_imported} Leads importiert,{" "}
                  {result.summary.berater_created} Berater erstellt,{" "}
                  {result.summary.setter_created} Setter erstellt
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {result.summary.leads_imported}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leads importiert
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {result.summary.berater_created}
                </div>
                <p className="text-xs text-muted-foreground">
                  Berater erstellt
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {result.summary.setter_created}
                </div>
                <p className="text-xs text-muted-foreground">
                  Setter erstellt
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {result.summary.leads_skipped}
                </div>
                <p className="text-xs text-muted-foreground">
                  Zeilen uebersprungen
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Berater Names */}
          {result.summary.berater_names.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Erstellte Berater</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.summary.berater_names.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Setter Names */}
          {result.summary.setter_names.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Erstellte Setter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.summary.setter_names.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leads by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Leads nach Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Anzahl</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(result.summary.leads_by_status)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => (
                      <TableRow key={status}>
                        <TableCell>
                          {STATUS_LABELS[status] ?? status}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {count}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Leads by Berater */}
          <Card>
            <CardHeader>
              <CardTitle>Leads nach Berater</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Berater</TableHead>
                    <TableHead className="text-right">Anzahl</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(result.summary.leads_by_berater)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, count]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {count}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Errors */}
          {result.summary.errors.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-800">
                  Warnungen / Fehler ({result.summary.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded bg-muted p-3 text-xs font-mono space-y-0.5">
                  {result.summary.errors.map((err, i) => (
                    <div key={i} className="text-amber-700">
                      {err}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs */}
          {result.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Import-Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto rounded bg-muted p-3 text-xs font-mono space-y-0.5">
                  {result.logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dashboard Link */}
          <div className="flex justify-center">
            <Button
              onClick={() => (window.location.href = "/admin")}
              size="lg"
            >
              Dashboard aktualisieren
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
