import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { distributeLeadToBerater } from "@/lib/routing/engine"

export async function POST(
  _request: NextRequest,
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

  // Get berater record for this user
  const { data: berater, error: beraterError } = await supabase
    .from("berater")
    .select("id")
    .eq("profile_id", user.id)
    .single()

  if (beraterError || !berater) {
    return NextResponse.json(
      { error: "Berater-Profil nicht gefunden" },
      { status: 403 }
    )
  }

  // Fetch lead and verify assignment
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 })
  }

  if (lead.berater_id !== berater.id) {
    return NextResponse.json(
      { error: "Dieser Lead ist Ihnen nicht zugewiesen" },
      { status: 403 }
    )
  }

  // Add current berater to previous_berater_ids
  const previousIds: string[] = Array.isArray(lead.previous_berater_ids)
    ? [...lead.previous_berater_ids]
    : []
  if (!previousIds.includes(berater.id)) {
    previousIds.push(berater.id)
  }

  // Use admin client for the update + redistribution
  const adminSupabase = createAdminClient()

  // Clear berater_id, set status back to 'neu', increment reassignment_count
  const { error: updateError } = await adminSupabase
    .from("leads")
    .update({
      berater_id: null,
      status: "neu",
      zugewiesen_am: null,
      sla_status: "none",
      sla_deadline: null,
      accepted_at: null,
      accepted_by: null,
      reassignment_count: (lead.reassignment_count ?? 0) + 1,
      previous_berater_ids: previousIds,
    })
    .eq("id", leadId)

  if (updateError) {
    return NextResponse.json(
      { error: "Fehler beim Ablehnen des Leads" },
      { status: 500 }
    )
  }

  // Close old assignment
  await adminSupabase
    .from("lead_assignments")
    .update({ is_active: false })
    .eq("lead_id", leadId)
    .eq("berater_id", berater.id)
    .eq("is_active", true)

  // Create activity
  await adminSupabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "rueckvergabe" as const,
    title: "Lead abgelehnt",
    description: `Lead von Berater abgelehnt. Umverteilung wird gestartet.`,
    created_by: user.id,
  })

  // Trigger redistribution (excluding previous beraters)
  try {
    await distributeLeadToBerater(leadId)
  } catch (err) {
    console.error(`[reject] Redistribution failed for lead ${leadId}:`, err)
  }

  return NextResponse.json({ success: true })
}
