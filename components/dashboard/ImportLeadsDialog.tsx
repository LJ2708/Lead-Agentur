"use client"

import { useState, useCallback, useRef } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, Download } from "lucide-react"
import { toast } from "sonner"

interface ImportResult {
  imported: number
  duplicates: number
  errors: string[]
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === "," || char === ";") {
        result.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())
  return result
}

function parseCsvPreview(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1, 6).map((line) => parseCsvLine(line))

  return { headers, rows }
}

export function ImportLeadsDialog({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setPreview(null)
    setTotalRows(0)
    setImporting(false)
    setProgress(null)
    setResult(null)
    setDragOver(false)
  }, [])

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Nur CSV-Dateien sind erlaubt")
      return
    }

    setFile(f)
    setResult(null)

    const text = await f.text()
    const parsed = parseCsvPreview(text)
    setPreview(parsed)

    const allLines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((l) => l.trim().length > 0)
    setTotalRows(Math.max(0, allLines.length - 1))
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  async function handleImport() {
    if (!file) return

    setImporting(true)
    setProgress("Import wird gestartet...")

    try {
      const formData = new FormData()
      formData.append("file", file)

      setProgress(`${totalRows} Leads werden importiert...`)

      const res = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      })

      const data = (await res.json()) as ImportResult | { error: string }

      if (!res.ok) {
        throw new Error((data as { error: string }).error || "Import fehlgeschlagen")
      }

      const importResult = data as ImportResult
      setResult(importResult)
      setProgress(null)

      if (importResult.imported > 0) {
        toast.success(`${importResult.imported} Leads erfolgreich importiert`)
        onImported?.()
      } else {
        toast.warning("Keine Leads importiert")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      toast.error(message)
      setProgress(null)
    } finally {
      setImporting(false)
    }
  }

  function downloadErrorReport() {
    if (!result?.errors.length) return

    const content = result.errors.join("\n")
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `import-fehler-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }


  function isKnownColumn(header: string): boolean {
    const h = header.toLowerCase().trim()
    const aliases: Record<string, string[]> = {
      vorname: ["vorname", "first_name", "firstname", "first name", "vname"],
      nachname: ["nachname", "last_name", "lastname", "last name", "nname", "name"],
      email: ["email", "e-mail", "mail", "e_mail"],
      telefon: ["telefon", "phone", "tel", "telephone", "telefonnummer", "phone_number"],
      quelle: ["quelle", "source", "herkunft"],
    }
    return Object.values(aliases).some((list) => list.includes(h))
  }

  function getMappedField(header: string): string | null {
    const h = header.toLowerCase().trim()
    const aliases: Record<string, string[]> = {
      Vorname: ["vorname", "first_name", "firstname", "first name", "vname"],
      Nachname: ["nachname", "last_name", "lastname", "last name", "nname", "name"],
      Email: ["email", "e-mail", "mail", "e_mail"],
      Telefon: ["telefon", "phone", "tel", "telephone", "telefonnummer", "phone_number"],
      Quelle: ["quelle", "source", "herkunft"],
    }
    for (const [field, list] of Object.entries(aliases)) {
      if (list.includes(h)) return field
    }
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-1 h-4 w-4" />
          CSV Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leads importieren</DialogTitle>
          <DialogDescription>
            CSV-Datei mit Leads hochladen. Spalten: Vorname, Nachname, Email,
            Telefon, Quelle (optional).
          </DialogDescription>
        </DialogHeader>

        {/* Upload Zone */}
        {!result && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            {file ? (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary">{totalRows} Zeilen</Badge>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  CSV-Datei hierher ziehen oder klicken zum Ausw&auml;hlen
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        )}

        {/* Preview */}
        {preview && !result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Vorschau (erste {Math.min(5, preview.rows.length)} Zeilen)
              </h3>
              <div className="flex gap-1">
                {preview.headers.map((h, i) => {
                  const mapped = getMappedField(h)
                  return (
                    <Badge
                      key={i}
                      variant={mapped ? "default" : "outline"}
                      className="text-xs"
                    >
                      {mapped ? `${h} → ${mapped}` : h}
                    </Badge>
                  )
                })}
              </div>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.headers.map((h, i) => (
                      <TableHead key={i} className={isKnownColumn(h) ? "text-foreground" : "text-muted-foreground"}>
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell key={ci} className="text-sm">
                          {cell || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{progress}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">Import abgeschlossen</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {result.imported}
                </p>
                <p className="text-xs text-green-600">Importiert</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">
                  {result.duplicates}
                </p>
                <p className="text-xs text-yellow-600">Duplikate</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {result.errors.length}
                </p>
                <p className="text-xs text-red-600">Fehler</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{result.errors.length} Fehler</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadErrorReport}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Fehlerbericht
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto rounded-md bg-muted p-2">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {err}
                    </p>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ... und {result.errors.length - 10} weitere Fehler
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button
              onClick={() => {
                setOpen(false)
                reset()
              }}
            >
              Schlie&szlig;en
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-4 w-4" />
                  Importieren
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
