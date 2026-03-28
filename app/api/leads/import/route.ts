import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// ---------------------------------------------------------------------------
// POST - Import leads from CSV file (admin only)
// ---------------------------------------------------------------------------

interface CsvRow {
  vorname?: string
  nachname?: string
  email?: string
  telefon?: string
  quelle?: string
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

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows = lines.slice(1).map((line) => parseCsvLine(line))

  return { headers, rows }
}

function mapColumns(
  headers: string[]
): Record<string, number> {
  const mapping: Record<string, number> = {}

  const aliases: Record<string, string[]> = {
    vorname: ["vorname", "first_name", "firstname", "first name", "vname"],
    nachname: ["nachname", "last_name", "lastname", "last name", "nname", "name"],
    email: ["email", "e-mail", "mail", "e_mail"],
    telefon: ["telefon", "phone", "tel", "telephone", "telefonnummer", "phone_number"],
    quelle: ["quelle", "source", "herkunft"],
  }

  for (const [field, aliasList] of Object.entries(aliases)) {
    const idx = headers.findIndex((h) => aliasList.includes(h))
    if (idx !== -1) {
      mapping[field] = idx
    }
  }

  return mapping
}

export async function POST(request: NextRequest) {
  // Auth check - admin only
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "admin" && profile.role !== "teamleiter")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Parse multipart form data
  let csvText: string
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine CSV-Datei gefunden" },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Nur CSV-Dateien sind erlaubt" },
        { status: 400 }
      )
    }

    csvText = await file.text()
  } catch {
    return NextResponse.json(
      { error: "Fehler beim Lesen der Datei" },
      { status: 400 }
    )
  }

  const { headers, rows } = parseCsv(csvText)

  if (headers.length === 0 || rows.length === 0) {
    return NextResponse.json(
      { error: "CSV-Datei ist leer oder hat keine Daten" },
      { status: 400 }
    )
  }

  const columnMap = mapColumns(headers)

  // Validate that we have at least email or telefon column
  if (columnMap.email === undefined && columnMap.telefon === undefined) {
    return NextResponse.json(
      {
        error:
          "CSV muss mindestens eine Email- oder Telefon-Spalte enthalten",
      },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  // Fetch existing emails for duplicate check
  const existingEmails = new Set<string>()
  if (columnMap.email !== undefined) {
    const emails = rows
      .map((row) => row[columnMap.email]?.toLowerCase().trim())
      .filter((e): e is string => !!e)

    if (emails.length > 0) {
      // Batch check in chunks of 100
      for (let i = 0; i < emails.length; i += 100) {
        const batch = emails.slice(i, i + 100)
        const { data } = await adminClient
          .from("leads")
          .select("email")
          .in("email", batch)

        if (data) {
          for (const row of data) {
            if (row.email) existingEmails.add(row.email.toLowerCase())
          }
        }
      }
    }
  }

  let imported = 0
  let duplicates = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because line 1 is header, arrays are 0-indexed

    const csvRow: CsvRow = {
      vorname: columnMap.vorname !== undefined ? row[columnMap.vorname]?.trim() : undefined,
      nachname: columnMap.nachname !== undefined ? row[columnMap.nachname]?.trim() : undefined,
      email: columnMap.email !== undefined ? row[columnMap.email]?.trim().toLowerCase() : undefined,
      telefon: columnMap.telefon !== undefined ? row[columnMap.telefon]?.trim() : undefined,
      quelle: columnMap.quelle !== undefined ? row[columnMap.quelle]?.trim() : undefined,
    }

    // Validate: at least email or telefon
    if (!csvRow.email && !csvRow.telefon) {
      errors.push(`Zeile ${rowNum}: Email oder Telefon fehlt`)
      continue
    }

    // Email format check
    if (csvRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(csvRow.email)) {
      errors.push(`Zeile ${rowNum}: Ungültige E-Mail "${csvRow.email}"`)
      continue
    }

    // Duplicate check
    if (csvRow.email && existingEmails.has(csvRow.email)) {
      duplicates++
      continue
    }

    // Insert lead
    const { error: insertError } = await adminClient.from("leads").insert({
      vorname: csvRow.vorname || null,
      nachname: csvRow.nachname || null,
      email: csvRow.email || null,
      telefon: csvRow.telefon || null,
      source: "import" as const,
      status: "neu" as const,
      custom_fields: csvRow.quelle ? { import_quelle: csvRow.quelle } : null,
    })

    if (insertError) {
      errors.push(`Zeile ${rowNum}: ${insertError.message}`)
      continue
    }

    // Add to existing emails set to prevent intra-file duplicates
    if (csvRow.email) {
      existingEmails.add(csvRow.email)
    }

    imported++
  }

  return NextResponse.json({
    imported,
    duplicates,
    errors,
  })
}
