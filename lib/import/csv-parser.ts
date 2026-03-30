/**
 * CSV parser that handles:
 * - Quoted fields (fields containing commas, newlines)
 * - German encoding (umlauts, special chars)
 * - Various line endings (CRLF, LF)
 */

export interface CsvRow {
  [key: string]: string
}

export function parseCsv(raw: string): CsvRow[] {
  // Normalize line endings
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  const rows: string[][] = []
  let current: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }

    if (ch === ",") {
      current.push(field.trim())
      field = ""
      i++
      continue
    }

    if (ch === "\n") {
      current.push(field.trim())
      field = ""
      if (current.length > 1 || current[0] !== "") {
        rows.push(current)
      }
      current = []
      i++
      continue
    }

    field += ch
    i++
  }

  // Last field/row
  if (field || current.length > 0) {
    current.push(field.trim())
    if (current.length > 1 || current[0] !== "") {
      rows.push(current)
    }
  }

  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim())
  const result: CsvRow[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    // Skip empty rows
    if (row.length === 1 && row[0] === "") continue

    const obj: CsvRow = {}
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] ?? ""
    }
    result.push(obj)
  }

  return result
}
