"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileUp, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { TablesInsert } from "@/types/database";

interface ImportProspectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface ParsedRow {
  full_name: string;
  company: string;
  position: string;
  linkedin_url: string;
  city: string;
  email: string;
  phone: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/["\u00fc\u00e4\u00f6]/g, (m) => {
    if (m === '"') return "";
    if (m === "\u00fc") return "ue";
    if (m === "\u00e4") return "ae";
    if (m === "\u00f6") return "oe";
    return m;
  }));

  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const companyIdx = headers.findIndex((h) => h.includes("company") || h.includes("firma") || h.includes("unternehmen"));
  const posIdx = headers.findIndex((h) => h.includes("position") || h.includes("titel"));
  const linkedinIdx = headers.findIndex((h) => h.includes("linkedin"));
  const cityIdx = headers.findIndex((h) => h.includes("city") || h.includes("stadt") || h.includes("ort"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("telefon") || h.includes("tel"));

  const separator = headerLine.includes("\t") ? "\t" : headerLine.includes(";") ? ";" : ",";

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator).map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = nameIdx >= 0 ? cols[nameIdx] ?? "" : "";
    if (!name) continue;

    rows.push({
      full_name: name,
      company: companyIdx >= 0 ? cols[companyIdx] ?? "" : "",
      position: posIdx >= 0 ? cols[posIdx] ?? "" : "",
      linkedin_url: linkedinIdx >= 0 ? cols[linkedinIdx] ?? "" : "",
      city: cityIdx >= 0 ? cols[cityIdx] ?? "" : "",
      email: emailIdx >= 0 ? cols[emailIdx] ?? "" : "",
      phone: phoneIdx >= 0 ? cols[phoneIdx] ?? "" : "",
    });
  }

  return rows;
}

export function ImportProspectsDialog({
  open,
  onOpenChange,
  onImported,
}: ImportProspectsDialogProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
      setImportedCount(null);
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);

    const supabase = createClient();
    const inserts: TablesInsert<"outreach_prospects">[] = parsedRows.map((r) => ({
      full_name: r.full_name,
      company: r.company || null,
      position: r.position || null,
      linkedin_url: r.linkedin_url || null,
      city: r.city || null,
      email: r.email || null,
      phone: r.phone || null,
      source: "import",
    }));

    const { error } = await supabase.from("outreach_prospects").insert(inserts);

    setImporting(false);

    if (error) {
      toast.error("Fehler beim Import: " + error.message);
    } else {
      setImportedCount(parsedRows.length);
      toast.success(`${parsedRows.length} Prospects importiert.`);
      onImported();
    }
  }

  function handleClose(openState: boolean) {
    if (!openState) {
      setParsedRows([]);
      setImportedCount(null);
      setDragOver(false);
    }
    onOpenChange(openState);
  }

  const previewRows = parsedRows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>CSV Import</DialogTitle>
          <DialogDescription>
            Importiere Prospects aus einer CSV-Datei. Erwartete Spalten: Name,
            Company, Position, LinkedIn URL, City, Email, Phone.
          </DialogDescription>
        </DialogHeader>

        {importedCount !== null ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-lg font-semibold">
              {importedCount} Prospects erfolgreich importiert
            </p>
            <Button onClick={() => handleClose(false)}>Schlie\u00dfen</Button>
          </div>
        ) : (
          <>
            {parsedRows.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-muted-foreground/25"
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  CSV-Datei hierher ziehen oder
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Datei ausw\u00e4hlen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {parsedRows.length} Zeilen erkannt. Vorschau der ersten{" "}
                  {Math.min(5, parsedRows.length)} Eintr\u00e4ge:
                </p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Unternehmen</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Stadt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {row.full_name}
                          </TableCell>
                          <TableCell>{row.company || "\u2014"}</TableCell>
                          <TableCell>{row.position || "\u2014"}</TableCell>
                          <TableCell>{row.city || "\u2014"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ...und {parsedRows.length - 5} weitere Eintr\u00e4ge
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Abbrechen
              </Button>
              {parsedRows.length > 0 && (
                <Button onClick={handleImport} disabled={importing}>
                  {importing
                    ? "Importiere..."
                    : `${parsedRows.length} Prospects importieren`}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
