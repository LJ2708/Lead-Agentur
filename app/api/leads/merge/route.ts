import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { mergeLeads } from "@/lib/leads/merge"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // --- Auth: verify admin role ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Nur Administratoren können Leads zusammenführen." },
      { status: 403 }
    )
  }

  // --- Parse body ---
  let body: { primary_lead_id?: string; secondary_lead_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })
  }

  const { primary_lead_id, secondary_lead_id } = body

  if (!primary_lead_id || !secondary_lead_id) {
    return NextResponse.json(
      { error: "primary_lead_id und secondary_lead_id sind erforderlich." },
      { status: 400 }
    )
  }

  if (primary_lead_id === secondary_lead_id) {
    return NextResponse.json(
      { error: "Primärer und sekundärer Lead dürfen nicht identisch sein." },
      { status: 400 }
    )
  }

  // --- Merge ---
  try {
    const result = await mergeLeads(primary_lead_id, secondary_lead_id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler"
    console.error("[leads/merge] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
