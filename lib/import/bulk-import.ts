import { type SupabaseClient } from "@supabase/supabase-js"
import { type Database } from "@/types/database"
import { parseCsv } from "./csv-parser"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeadStatus = Database["public"]["Enums"]["lead_status"]
type LeadSource = Database["public"]["Enums"]["lead_source"]

export interface ImportSummary {
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
  "Abschluss": "abschluss",
  "Dublette": "verloren",
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
  // Format: "26.03.2026 01:28" or "26.03.2026"
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

function splitFullName(fullName: string): { vorname: string; nachname: string } {
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
  if (n) {
    return `${v}.${n}@${domain}`
  }
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
// Main import function
// ---------------------------------------------------------------------------

export async function runBulkImport(
  supabase: SupabaseClient<Database>,
  csvContent: string,
  onProgress?: (msg: string) => void
): Promise<ImportSummary> {
  const log = onProgress ?? (() => {})
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

  // 1. Parse CSV
  log("CSV wird geparst...")
  const rows = parseCsv(csvContent)
  log(`${rows.length} Zeilen gefunden`)

  if (rows.length === 0) {
    summary.errors.push("Keine Daten in CSV gefunden")
    return summary
  }

  // 2. Extract unique berater names
  const beraterNames = new Set<string>()
  const setterNames = new Set<string>()

  for (const row of rows) {
    const berater = (row["Berater"] ?? "").trim()
    if (berater) beraterNames.add(berater)

    const telefonist = (row["Telefonist"] ?? "").trim()
    if (telefonist) setterNames.add(telefonist)
  }

  log(`${beraterNames.size} eindeutige Berater gefunden`)
  log(`${setterNames.size} eindeutige Setter gefunden`)

  // 3. Create berater accounts
  const beraterIdMap = new Map<string, string>() // full_name -> berater.id
  const beraterProfileMap = new Map<string, string>() // full_name -> profile.id

  // First, load all existing profiles that match
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")

  const existingProfileByName = new Map<string, { id: string; role: string }>()
  for (const p of existingProfiles ?? []) {
    existingProfileByName.set(p.full_name, { id: p.id, role: p.role })
  }

  // Load all existing berater records
  const { data: existingBerater } = await supabase
    .from("berater")
    .select("id, profile_id")

  const existingBeraterByProfile = new Map<string, string>()
  for (const b of existingBerater ?? []) {
    existingBeraterByProfile.set(b.profile_id, b.id)
  }

  for (const name of Array.from(beraterNames)) {
    log(`Berater pruefen: ${name}`)

    const existing = existingProfileByName.get(name)
    if (existing) {
      // Profile exists - check if berater record exists
      beraterProfileMap.set(name, existing.id)
      const beraterId = existingBeraterByProfile.get(existing.id)
      if (beraterId) {
        beraterIdMap.set(name, beraterId)
        log(`  -> Berater existiert bereits: ${name}`)
        continue
      }
      // Profile exists but no berater record - create one
      const { data: newBerater, error: beraterError } = await supabase
        .from("berater")
        .insert({
          profile_id: existing.id,
          status: "aktiv",
          leads_pro_monat: 10,
          preis_pro_lead_cents: 5900,
        })
        .select("id")
        .single()

      if (beraterError) {
        summary.errors.push(
          `Berater-Record erstellen fehlgeschlagen fuer ${name}: ${beraterError.message}`
        )
        continue
      }
      beraterIdMap.set(name, newBerater.id)
      summary.berater_created++
      summary.berater_names.push(name)
      log(`  -> Berater-Record erstellt fuer existierendes Profil: ${name}`)
      continue
    }

    // Create new auth user (SILENT - no email confirmation)
    const email = generateEmail(name, "leadsolution-intern.de")
    const password = generatePassword()

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation
        user_metadata: { full_name: name },
      })

    if (authError) {
      summary.errors.push(
        `Auth-User erstellen fehlgeschlagen fuer ${name} (${email}): ${authError.message}`
      )
      continue
    }

    const userId = authData.user.id

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      full_name: name,
      role: "berater",
    })

    if (profileError) {
      summary.errors.push(
        `Profil erstellen fehlgeschlagen fuer ${name}: ${profileError.message}`
      )
      continue
    }

    beraterProfileMap.set(name, userId)

    // Create berater record
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
        `Berater-Record erstellen fehlgeschlagen fuer ${name}: ${beraterError.message}`
      )
      continue
    }

    beraterIdMap.set(name, newBerater.id)
    summary.berater_created++
    summary.berater_names.push(name)
    log(`  -> Neuer Berater erstellt: ${name} (${email})`)
  }

  // 4. Create setter accounts
  const setterIdMap = new Map<string, string>() // full_name -> profile.id

  for (const name of Array.from(setterNames)) {
    log(`Setter pruefen: ${name}`)

    const existing = existingProfileByName.get(name)
    if (existing) {
      setterIdMap.set(name, existing.id)
      log(`  -> Setter existiert bereits: ${name}`)
      continue
    }

    // Create new auth user
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
      summary.errors.push(
        `Setter Auth-User erstellen fehlgeschlagen fuer ${name} (${email}): ${authError.message}`
      )
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
        `Setter Profil erstellen fehlgeschlagen fuer ${name}: ${profileError.message}`
      )
      continue
    }

    setterIdMap.set(name, userId)
    summary.setter_created++
    summary.setter_names.push(name)
    log(`  -> Neuer Setter erstellt: ${name} (${email})`)
  }

  // 5. Import leads in batches
  log("Leads werden importiert...")
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

    // Resolve berater
    const beraterId = beraterName ? beraterIdMap.get(beraterName) ?? null : null

    // Resolve setter
    const setterId = telefonist ? setterIdMap.get(telefonist) ?? null : null

    // Parse source
    const source: LeadSource = SOURCE_MAP[leadquelle] ?? "import"

    // Parse date
    const createdAt = parseGermanDate(eingetragen)

    // Build custom fields
    const customFields: Record<string, string> = {}
    if (erreichbarkeit) customFields.erreichbarkeit = erreichbarkeit
    if (beruflicheSituation)
      customFields.berufliche_situation = beruflicheSituation
    if (phase) customFields.original_phase = phase

    // Handle name: if nachname is empty, try to split vorname
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
      zugewiesen_am: beraterId ? (createdAt ?? new Date().toISOString()) : null,
      custom_fields:
        Object.keys(customFields).length > 0 ? customFields : null,
      ...(createdAt ? { created_at: createdAt } : {}),
    }

    leadInserts.push(leadData)

    // Track stats
    summary.leads_by_status[status] =
      (summary.leads_by_status[status] ?? 0) + 1
    if (beraterName) {
      summary.leads_by_berater[beraterName] =
        (summary.leads_by_berater[beraterName] ?? 0) + 1
    }
  }

  // Insert in batches
  for (let b = 0; b < leadInserts.length; b += BATCH_SIZE) {
    const batch = leadInserts.slice(b, b + BATCH_SIZE)
    const batchNum = Math.floor(b / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(leadInserts.length / BATCH_SIZE)
    log(`Batch ${batchNum}/${totalBatches} (${batch.length} Leads)...`)

    const { error: insertError } = await supabase.from("leads").insert(batch)

    if (insertError) {
      summary.errors.push(
        `Batch ${batchNum} fehlgeschlagen: ${insertError.message}`
      )
      summary.leads_skipped += batch.length
    } else {
      summary.leads_imported += batch.length
    }
  }

  log("Import abgeschlossen!")
  return summary
}
