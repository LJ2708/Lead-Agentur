import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type LeadStatus = Database["public"]["Enums"]["lead_status"]

type ContactOutcome =
  | "reached"
  | "not_reached"
  | "invalid"
  | "callback"
  | "not_interested"
  | "appointment"

interface OutcomeBody {
  outcome: ContactOutcome
  note?: string
  callback_at?: string
  termin_at?: string
}

const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  reached: "Erreicht",
  not_reached: "Nicht erreicht",
  invalid: "Ung\u00fcltige Nummer",
  callback: "R\u00fcckruf vereinbart",
  not_interested: "Kein Interesse",
  appointment: "Termin vereinbart",
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params
  const supabase = await createClient()

  // Verify authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
  }

  const body = (await request.json()) as OutcomeBody
  const { outcome, note, callback_at, termin_at } = body

  const validOutcomes: ContactOutcome[] = [
    "reached",
    "not_reached",
    "invalid",
    "callback",
    "not_interested",
    "appointment",
  ]

  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json(
      { error: "Ung\u00fcltiges Ergebnis" },
      { status: 400 }
    )
  }

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 })
  }

  // Build update payload
  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = {
    contact_outcome: outcome,
    sla_status: "met", // Any contact attempt fulfills SLA
  }

  // Set first_contact_at if not already set
  if (!lead.first_contact_at) {
    updateData.first_contact_at = now
  }

  // Also set the legacy field
  if (!lead.erster_kontakt_am) {
    updateData.erster_kontakt_am = now
  }

  // Determine new status based on outcome
  let newStatus: LeadStatus
  switch (outcome) {
    case "reached":
      newStatus = "kontaktversuch"
      break
    case "not_reached":
      newStatus = "nicht_erreicht"
      updateData.kontaktversuche = (lead.kontaktversuche ?? 0) + 1
      break
    case "invalid":
      newStatus = "verloren"
      break
    case "callback":
      newStatus = "nachfassen"
      if (callback_at) {
        updateData.callback_at = callback_at
        updateData.naechste_erinnerung = callback_at
      }
      break
    case "not_interested":
      newStatus = "verloren"
      break
    case "appointment":
      newStatus = "termin"
      if (termin_at) {
        updateData.termin_am = termin_at
      }
      break
  }

  updateData.status = newStatus

  const { data: updatedLead, error: updateError } = await supabase
    .from("leads")
    .update(updateData)
    .eq("id", leadId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: "Fehler beim Speichern des Ergebnisses" },
      { status: 500 }
    )
  }

  // Create activity
  const description = [
    `Kontaktergebnis: ${OUTCOME_LABELS[outcome]}`,
    note ? `Notiz: ${note}` : null,
    callback_at ? `R\u00fcckruf: ${new Date(callback_at).toLocaleString("de-DE")}` : null,
    termin_at ? `Termin: ${new Date(termin_at).toLocaleString("de-DE")}` : null,
  ]
    .filter(Boolean)
    .join(". ")

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "anruf" as const,
    title: `Kontakt: ${OUTCOME_LABELS[outcome]}`,
    description,
    old_value: lead.status,
    new_value: newStatus,
    created_by: user.id,
  })

  // If outcome is 'appointment', create termin record
  if (outcome === "appointment" && termin_at && lead.berater_id) {
    await supabase.from("termine").insert({
      lead_id: leadId,
      berater_id: lead.berater_id,
      datum: termin_at,
      status: "geplant",
      notizen: note || null,
      erstellt_von: user.id,
    })
  }

  // If outcome is 'invalid' or 'not_interested', add note as activity
  if ((outcome === "invalid" || outcome === "not_interested") && note) {
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "notiz" as const,
      title:
        outcome === "invalid"
          ? "Ung\u00fcltige Nummer"
          : "Kein Interesse",
      description: note,
      created_by: user.id,
    })
  }

  return NextResponse.json({ lead: updatedLead })
}
