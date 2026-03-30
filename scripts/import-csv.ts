/**
 * CLI script for bulk CSV import.
 *
 * Usage:
 *   npx tsx scripts/import-csv.ts "/path/to/file.csv"
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Load them via .env.local or export them before running.
 */

import * as fs from "fs"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/database"
import { parseCsv } from "../lib/import/csv-parser"

// ---------------------------------------------------------------------------
// Types (duplicated from bulk-import to avoid @/ alias issues in tsx runner)
// ---------------------------------------------------------------------------

type LeadStatus = Database["public"]["Enums"]["lead_status"]
type LeadSource = Database["public"]["Enums"]["lead_source"]

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

// ---------------------------------------------------------------------------
// Mappings
// ---------------------------------------------------------------------------

const PHASE_TO_STATUS: Record<string, LeadStatus> = {
  "Neuer Lead": "neu",
  "Nicht erreicht": "nicht_erreicht",
  "Erstkontakt erfolgt": "kontaktversuch",
  "Nicht qualifiziert": "verloren",
  "Kein Interesse": "verloren",
  "Falsche Daten": "verloren",
  "1. Termin vereinbart": "termin",
  "2. Termin vereinbart": "termin",
  "3. Termin vereinbart": "termin",
  "Nicht erschienen": "no_show",
  Abschluss: "abschluss",
  Dublette: "verloren",
}

const SOURCE_MAP: Record<string, LeadSource> = {
  META: "meta_lead_ad",
  Landingpage: "landingpage",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseGermanDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null
  const trimmed = dateStr.trim()
  const match = trimmed.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
  )
  if (!match) return null
  const day = match[1].padStart(2, "0")
  const month = match[2].padStart(2, "0")
  const year = match[3]
  const hour = (match[4] ?? "00").padStart(2, "0")
  const minute = (match[5] ?? "00").padStart(2, "0")
  return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9.]/g, "")
}

function splitFullName(fullName: string): {
  vorname: string
  nachname: string
} {
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { vorname: parts[0], nachname: "" }
  }
  const nachname = parts[parts.length - 1]
  const vorname = parts.slice(0, -1).join(" ")
  return { vorname, nachname }
}

function generateEmail(fullName: string, domain: string): string {
  const { vorname, nachname } = splitFullName(fullName)
  const v = sanitizeName(vorname)
  const n = sanitizeName(nachname)
  if (n) return `${v}.${n}@${domain}`
  return `${v}@${domain}`
}

function generatePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
  let pw = ""
  for (let i = 0; i < 24; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)]
  }
  return pw
}

// ---------------------------------------------------------------------------
// Load env from .env.local
// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local")
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      let value = trimmed.slice(eqIndex + 1).trim()
      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnv()

  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-csv.ts <path-to-csv>")
    process.exit(1)
  }

  const resolvedPath = path.resolve(csvPath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Datei nicht gefunden: ${resolvedPath}`)
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein"
    )
    process.exit(1)
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`\nCSV-Datei: ${resolvedPath}`)
  const csvContent = fs.readFileSync(resolvedPath, "utf-8")

  console.log("CSV wird geparst...")
  const rows = parseCsv(csvContent)
  console.log(`${rows.length} Zeilen gefunden\n`)

  if (rows.length === 0) {
    console.error("Keine Daten in CSV gefunden")
    process.exit(1)
  }

  const summary: ImportSummary = {
    berater_created: 0,
    berater_names: [],
    setter_created: 0,
    setter_names: [],
    leads_imported: 0,
    leads_skipped: 0,
    leads_by_status: {},
    leads_by_berater: {},
    errors: [],
  }

  // Extract unique names
  const beraterNames = new Set<string>()
  const setterNames = new Set<string>()

  for (const row of rows) {
    const berater = (row["Berater"] ?? "").trim()
    if (berater) beraterNames.add(berater)
    const telefonist = (row["Telefonist"] ?? "").trim()
    if (telefonist) setterNames.add(telefonist)
  }

  console.log(`${beraterNames.size} eindeutige Berater`)
  console.log(`${setterNames.size} eindeutige Setter\n`)

  // Load existing profiles and berater
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")

  const existingProfileByName = new Map<
    string,
    { id: string; role: string }
  >()
  for (const p of existingProfiles ?? []) {
    existingProfileByName.set(p.full_name, { id: p.id, role: p.role })
  }

  const { data: existingBerater } = await supabase
    .from("berater")
    .select("id, profile_id")

  const existingBeraterByProfile = new Map<string, string>()
  for (const b of existingBerater ?? []) {
    existingBeraterByProfile.set(b.profile_id, b.id)
  }

  const beraterIdMap = new Map<string, string>()
  const setterIdMap = new Map<string, string>()

  // Create berater
  for (const name of Array.from(beraterNames)) {
    process.stdout.write(`Berater: ${name} ... `)

    const existing = existingProfileByName.get(name)
    if (existing) {
      const beraterId = existingBeraterByProfile.get(existing.id)
      if (beraterId) {
        beraterIdMap.set(name, beraterId)
        console.log("existiert")
        continue
      }
      const { data: newB, error: bErr } = await supabase
        .from("berater")
        .insert({
          profile_id: existing.id,
          status: "aktiv",
          leads_pro_monat: 10,
          preis_pro_lead_cents: 5900,
        })
        .select("id")
        .single()

      if (bErr) {
        summary.errors.push(`Berater-Record fuer ${name}: ${bErr.message}`)
        console.log(`FEHLER: ${bErr.message}`)
        continue
      }
      beraterIdMap.set(name, newB.id)
      summary.berater_created++
      summary.berater_names.push(name)
      console.log("Record erstellt")
      continue
    }

    const email = generateEmail(name, "leadsolution-intern.de")
    const password = generatePassword()

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      })

    if (authError) {
      summary.errors.push(`Auth fuer ${name}: ${authError.message}`)
      console.log(`AUTH FEHLER: ${authError.message}`)
      continue
    }

    const userId = authData.user.id

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      full_name: name,
      role: "berater",
    })

    if (profileError) {
      summary.errors.push(`Profil fuer ${name}: ${profileError.message}`)
      console.log(`PROFIL FEHLER: ${profileError.message}`)
      continue
    }

    const { data: newBerater, error: beraterError } = await supabase
      .from("berater")
      .insert({
        profile_id: userId,
        status: "aktiv",
        leads_pro_monat: 10,
        preis_pro_lead_cents: 5900,
      })
      .select("id")
      .single()

    if (beraterError) {
      summary.errors.push(
        `Berater-Record fuer ${name}: ${beraterError.message}`
      )
      console.log(`BERATER FEHLER: ${beraterError.message}`)
      continue
    }

    beraterIdMap.set(name, newBerater.id)
    summary.berater_created++
    summary.berater_names.push(name)
    console.log(`erstellt (${email})`)
  }

  // Create setter
  console.log()
  for (const name of Array.from(setterNames)) {
    process.stdout.write(`Setter: ${name} ... `)

    const existing = existingProfileByName.get(name)
    if (existing) {
      setterIdMap.set(name, existing.id)
      console.log("existiert")
      continue
    }

    const email = generateEmail(name, "leadsolution-intern.de")
    const password = generatePassword()

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      })

    if (authError) {
      summary.errors.push(`Setter Auth fuer ${name}: ${authError.message}`)
      console.log(`AUTH FEHLER: ${authError.message}`)
      continue
    }

    const userId = authData.user.id

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      full_name: name,
      role: "setter",
    })

    if (profileError) {
      summary.errors.push(
        `Setter Profil fuer ${name}: ${profileError.message}`
      )
      console.log(`PROFIL FEHLER: ${profileError.message}`)
      continue
    }

    setterIdMap.set(name, userId)
    summary.setter_created++
    summary.setter_names.push(name)
    console.log(`erstellt (${email})`)
  }

  // Import leads
  console.log("\nLeads werden importiert...")

  const BATCH_SIZE = 50
  const leadInserts: Database["public"]["Tables"]["leads"]["Insert"][] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const phase = (row["Phase"] ?? "").trim()
    const status = PHASE_TO_STATUS[phase]
    if (!status) {
      summary.errors.push(
        `Zeile ${i + 2}: Unbekannte Phase "${phase}" - uebersprungen`
      )
      summary.leads_skipped++
      continue
    }

    const vorname = (row["Vorname"] ?? "").trim()
    const nachname = (row["Nachname"] ?? "").trim()
    const beraterName = (row["Berater"] ?? "").trim()
    const telefon = (row["Telefonnummer"] ?? "").trim()
    const email = (row["Mail"] ?? "").trim()
    const eingetragen = (row["Eingetragen"] ?? "").trim()
    const leadquelle = (row["Leadquelle"] ?? "").trim()
    const werbegrafik = (row["Werbegrafik"] ?? "").trim()
    const telefonist = (row["Telefonist"] ?? "").trim()
    const erreichbarkeit = (
      row["Wann bist du am besten telefonisch erreichbar?"] ?? ""
    ).trim()
    const beruflicheSituation = (
      row["Berufliche Situation"] ?? ""
    ).trim()

    const beraterId = beraterName
      ? beraterIdMap.get(beraterName) ?? null
      : null
    const setterId = telefonist
      ? setterIdMap.get(telefonist) ?? null
      : null
    const source: LeadSource = SOURCE_MAP[leadquelle] ?? "import"
    const createdAt = parseGermanDate(eingetragen)

    const customFields: Record<string, string> = {}
    if (erreichbarkeit) customFields.erreichbarkeit = erreichbarkeit
    if (beruflicheSituation)
      customFields.berufliche_situation = beruflicheSituation
    if (phase) customFields.original_phase = phase

    let finalVorname = vorname
    let finalNachname = nachname
    if (!finalNachname && finalVorname.includes(" ")) {
      const split = splitFullName(finalVorname)
      finalVorname = split.vorname
      finalNachname = split.nachname
    }

    const leadData: Database["public"]["Tables"]["leads"]["Insert"] = {
      vorname: finalVorname || null,
      nachname: finalNachname || null,
      email: email || null,
      telefon: telefon || null,
      status,
      source,
      ad_name: werbegrafik || null,
      berater_id: beraterId,
      setter_id: setterId,
      zugewiesen_am: beraterId
        ? (createdAt ?? new Date().toISOString())
        : null,
      custom_fields:
        Object.keys(customFields).length > 0 ? customFields : null,
      ...(createdAt ? { created_at: createdAt } : {}),
    }

    leadInserts.push(leadData)

    summary.leads_by_status[status] =
      (summary.leads_by_status[status] ?? 0) + 1
    if (beraterName) {
      summary.leads_by_berater[beraterName] =
        (summary.leads_by_berater[beraterName] ?? 0) + 1
    }
  }

  for (let b = 0; b < leadInserts.length; b += BATCH_SIZE) {
    const batch = leadInserts.slice(b, b + BATCH_SIZE)
    const batchNum = Math.floor(b / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(leadInserts.length / BATCH_SIZE)
    process.stdout.write(
      `  Batch ${batchNum}/${totalBatches} (${batch.length} Leads)... `
    )

    const { error: insertError } = await supabase.from("leads").insert(batch)

    if (insertError) {
      summary.errors.push(
        `Batch ${batchNum} fehlgeschlagen: ${insertError.message}`
      )
      summary.leads_skipped += batch.length
      console.log(`FEHLER: ${insertError.message}`)
    } else {
      summary.leads_imported += batch.length
      console.log("OK")
    }
  }

  // Print summary
  console.log("\n========================================")
  console.log("           IMPORT ZUSAMMENFASSUNG")
  console.log("========================================\n")
  console.log(`Berater erstellt:    ${summary.berater_created}`)
  if (summary.berater_names.length > 0) {
    console.log(`  -> ${summary.berater_names.join(", ")}`)
  }
  console.log(`Setter erstellt:     ${summary.setter_created}`)
  if (summary.setter_names.length > 0) {
    console.log(`  -> ${summary.setter_names.join(", ")}`)
  }
  console.log(`Leads importiert:    ${summary.leads_imported}`)
  console.log(`Leads uebersprungen: ${summary.leads_skipped}`)

  console.log("\nLeads nach Status:")
  for (const [status, count] of Object.entries(summary.leads_by_status).sort(
    ([, a], [, b]) => b - a
  )) {
    console.log(`  ${status.padEnd(20)} ${count}`)
  }

  console.log("\nLeads nach Berater:")
  for (const [name, count] of Object.entries(summary.leads_by_berater).sort(
    ([, a], [, b]) => b - a
  )) {
    console.log(`  ${name.padEnd(30)} ${count}`)
  }

  if (summary.errors.length > 0) {
    console.log(`\nFehler (${summary.errors.length}):`)
    for (const err of summary.errors) {
      console.log(`  - ${err}`)
    }
  }

  console.log("\nFertig!")
}

main().catch((err) => {
  console.error("Fataler Fehler:", err)
  process.exit(1)
})
