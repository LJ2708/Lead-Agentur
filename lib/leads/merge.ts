import { createAdminClient } from "@/lib/supabase/admin"
import type { Database, Json } from "@/types/database"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Lead = Database["public"]["Tables"]["leads"]["Row"]

export interface MergeResult {
  success: boolean
  mergedLead: Lead
  fieldsUpdated: string[]
  activitiesMoved: number
  termineMoved: number
}

// ---------------------------------------------------------------------------
// Status priority for merge decisions
// ---------------------------------------------------------------------------

const STATUS_PRIORITY: Record<string, number> = {
  abschluss: 10,
  show: 9,
  termin: 8,
  qualifiziert: 7,
  kontaktversuch: 6,
  nachfassen: 5,
  zugewiesen: 4,
  nicht_erreicht: 3,
  no_show: 2,
  neu: 1,
  warteschlange: 0,
  verloren: -1,
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

export async function mergeLeads(
  primaryId: string,
  secondaryId: string
): Promise<MergeResult> {
  const supabase = createAdminClient()

  // 1. Fetch both leads
  const { data: primary, error: primaryErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", primaryId)
    .single()

  if (primaryErr || !primary) {
    throw new Error(`Primärer Lead nicht gefunden: ${primaryId}`)
  }

  const { data: secondary, error: secondaryErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", secondaryId)
    .single()

  if (secondaryErr || !secondary) {
    throw new Error(`Sekundärer Lead nicht gefunden: ${secondaryId}`)
  }

  // 2. Merge data
  const fieldsUpdated: string[] = []

  // Fill empty fields on primary from secondary
  const textFields = [
    "vorname",
    "nachname",
    "email",
    "telefon",
    "campaign",
    "adset",
    "ad_name",
    "form_id",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "meta_lead_id",
    "contact_outcome",
  ] as const

  type TextFieldKey = (typeof textFields)[number]

  const updates: Record<string, unknown> = {}

  for (const field of textFields) {
    const primaryVal = primary[field as TextFieldKey]
    const secondaryVal = secondary[field as TextFieldKey]
    if (!primaryVal && secondaryVal) {
      updates[field] = secondaryVal
      fieldsUpdated.push(field)
    }
  }

  // Merge custom_fields (combine objects)
  const primaryCustom =
    primary.custom_fields && typeof primary.custom_fields === "object" && !Array.isArray(primary.custom_fields)
      ? (primary.custom_fields as Record<string, Json | undefined>)
      : {}
  const secondaryCustom =
    secondary.custom_fields && typeof secondary.custom_fields === "object" && !Array.isArray(secondary.custom_fields)
      ? (secondary.custom_fields as Record<string, Json | undefined>)
      : {}

  const mergedCustomFields: Record<string, Json | undefined> = { ...secondaryCustom, ...primaryCustom }
  if (Object.keys(mergedCustomFields).length > 0) {
    updates.custom_fields = mergedCustomFields
    if (Object.keys(secondaryCustom).length > 0) {
      fieldsUpdated.push("custom_fields")
    }
  }

  // Status: keep whichever is further in the pipeline
  const primaryPriority = STATUS_PRIORITY[primary.status] ?? 0
  const secondaryPriority = STATUS_PRIORITY[secondary.status] ?? 0
  if (secondaryPriority > primaryPriority) {
    updates.status = secondary.status
    fieldsUpdated.push("status")
  }

  // berater_id: keep primary's if set, otherwise use secondary's
  if (!primary.berater_id && secondary.berater_id) {
    updates.berater_id = secondary.berater_id
    fieldsUpdated.push("berater_id")
  }

  // setter_id: keep primary's if set, otherwise use secondary's
  if (!primary.setter_id && secondary.setter_id) {
    updates.setter_id = secondary.setter_id
    fieldsUpdated.push("setter_id")
  }

  // Sum kontaktversuche
  const totalKontaktversuche = primary.kontaktversuche + secondary.kontaktversuche
  if (secondary.kontaktversuche > 0) {
    updates.kontaktversuche = totalKontaktversuche
    fieldsUpdated.push("kontaktversuche")
  }

  // Keep earliest created_at
  if (new Date(secondary.created_at) < new Date(primary.created_at)) {
    updates.created_at = secondary.created_at
    fieldsUpdated.push("created_at")
  }

  // Merge opt_in flags (true if either is true)
  if (secondary.opt_in_email && !primary.opt_in_email) {
    updates.opt_in_email = true
    fieldsUpdated.push("opt_in_email")
  }
  if (secondary.opt_in_whatsapp && !primary.opt_in_whatsapp) {
    updates.opt_in_whatsapp = true
    fieldsUpdated.push("opt_in_whatsapp")
  }
  if (secondary.opt_in_telefon && !primary.opt_in_telefon) {
    updates.opt_in_telefon = true
    fieldsUpdated.push("opt_in_telefon")
  }

  // Keep earliest date fields
  const dateFields = [
    "erster_kontakt_am",
    "zugewiesen_am",
    "first_contact_at",
    "accepted_at",
  ] as const

  for (const field of dateFields) {
    const pVal = primary[field]
    const sVal = secondary[field]
    if (!pVal && sVal) {
      updates[field] = sVal
      fieldsUpdated.push(field)
    } else if (pVal && sVal && new Date(sVal) < new Date(pVal)) {
      updates[field] = sVal
      fieldsUpdated.push(field)
    }
  }

  // Keep latest termin_am / abschluss_am
  if (!primary.termin_am && secondary.termin_am) {
    updates.termin_am = secondary.termin_am
    fieldsUpdated.push("termin_am")
  } else if (
    primary.termin_am &&
    secondary.termin_am &&
    new Date(secondary.termin_am) > new Date(primary.termin_am)
  ) {
    updates.termin_am = secondary.termin_am
    fieldsUpdated.push("termin_am")
  }

  if (!primary.abschluss_am && secondary.abschluss_am) {
    updates.abschluss_am = secondary.abschluss_am
    fieldsUpdated.push("abschluss_am")
  }

  // Merge previous_berater_ids
  const prevBeraterPrimary = primary.previous_berater_ids ?? []
  const prevBeraterSecondary = secondary.previous_berater_ids ?? []
  const allPrevBerater = Array.from(new Set([...prevBeraterPrimary, ...prevBeraterSecondary]))
  if (allPrevBerater.length > prevBeraterPrimary.length) {
    updates.previous_berater_ids = allPrevBerater
    fieldsUpdated.push("previous_berater_ids")
  }

  // Sum reassignment_count and rueckvergabe_count
  if (secondary.reassignment_count > 0) {
    updates.reassignment_count = primary.reassignment_count + secondary.reassignment_count
    fieldsUpdated.push("reassignment_count")
  }
  if (secondary.rueckvergabe_count > 0) {
    updates.rueckvergabe_count = primary.rueckvergabe_count + secondary.rueckvergabe_count
    fieldsUpdated.push("rueckvergabe_count")
  }

  updates.updated_at = new Date().toISOString()

  // 3. Update primary lead
  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await supabase
      .from("leads")
      .update(updates as Database["public"]["Tables"]["leads"]["Update"])
      .eq("id", primaryId)

    if (updateErr) {
      throw new Error(`Fehler beim Aktualisieren des primären Leads: ${updateErr.message}`)
    }
  }

  // 4. Move activities from secondary to primary
  const { data: activitiesData } = await supabase
    .from("lead_activities")
    .select("id")
    .eq("lead_id", secondaryId)

  const activitiesMoved = activitiesData?.length ?? 0

  if (activitiesMoved > 0) {
    await supabase
      .from("lead_activities")
      .update({ lead_id: primaryId })
      .eq("lead_id", secondaryId)
  }

  // 5. Move assignments from secondary to primary
  await supabase
    .from("lead_assignments")
    .update({ lead_id: primaryId })
    .eq("lead_id", secondaryId)

  // 6. Move termine from secondary to primary
  const { data: termineData } = await supabase
    .from("termine")
    .select("id")
    .eq("lead_id", secondaryId)

  const termineMoved = termineData?.length ?? 0

  if (termineMoved > 0) {
    await supabase
      .from("termine")
      .update({ lead_id: primaryId })
      .eq("lead_id", secondaryId)
  }

  // 7. Move nachrichten from secondary to primary
  await supabase
    .from("nachrichten")
    .update({ lead_id: primaryId })
    .eq("lead_id", secondaryId)

  // 8. Move lead_tags from secondary to primary (skip duplicates)
  const { data: primaryTags } = await supabase
    .from("lead_tags")
    .select("tag_id")
    .eq("lead_id", primaryId)

  const { data: secondaryTags } = await supabase
    .from("lead_tags")
    .select("tag_id")
    .eq("lead_id", secondaryId)

  const existingTagIds = new Set((primaryTags ?? []).map((t) => t.tag_id))
  const tagsToMove = (secondaryTags ?? []).filter((t) => !existingTagIds.has(t.tag_id))

  if (tagsToMove.length > 0) {
    await supabase.from("lead_tags").insert(
      tagsToMove.map((t) => ({
        lead_id: primaryId,
        tag_id: t.tag_id,
      }))
    )
  }

  // Delete secondary's lead_tags
  await supabase.from("lead_tags").delete().eq("lead_id", secondaryId)

  // 9. Create merge activity
  const secondaryName = [secondary.vorname, secondary.nachname].filter(Boolean).join(" ") || "Unbekannt"
  await supabase.from("lead_activities").insert({
    lead_id: primaryId,
    type: "system",
    title: "Lead zusammengeführt",
    description: `Lead "${secondaryName}" (${secondaryId.slice(0, 8)}) wurde in diesen Lead zusammengeführt. ${fieldsUpdated.length} Felder aktualisiert, ${activitiesMoved} Aktivitäten und ${termineMoved} Termine übernommen.`,
  })

  // 10. Delete secondary lead
  const { error: deleteErr } = await supabase
    .from("leads")
    .delete()
    .eq("id", secondaryId)

  if (deleteErr) {
    throw new Error(`Fehler beim Löschen des sekundären Leads: ${deleteErr.message}`)
  }

  // 11. Fetch and return merged lead
  const { data: mergedLead, error: fetchErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", primaryId)
    .single()

  if (fetchErr || !mergedLead) {
    throw new Error("Fehler beim Abrufen des zusammengeführten Leads")
  }

  return {
    success: true,
    mergedLead,
    fieldsUpdated,
    activitiesMoved,
    termineMoved,
  }
}
