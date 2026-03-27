import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

  // Accept: set accepted_at, start SLA
  const now = new Date()
  const slaDeadline = new Date(now.getTime() + 30 * 60 * 1000) // +30 minutes

  const updateData: Record<string, unknown> = {
    accepted_at: now.toISOString(),
    accepted_by: user.id,
    sla_deadline: slaDeadline.toISOString(),
    sla_status: "active",
  }

  // If lead was 'neu', move to 'zugewiesen'
  if (lead.status === "neu") {
    updateData.status = "zugewiesen"
  }

  const { data: updatedLead, error: updateError } = await supabase
    .from("leads")
    .update(updateData)
    .eq("id", leadId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: "Fehler beim Akzeptieren des Leads" },
      { status: 500 }
    )
  }

  // Create activity
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "system" as const,
    title: "Lead akzeptiert",
    description: `Lead von Berater akzeptiert. SLA: 30 Minuten bis ${slaDeadline.toLocaleTimeString("de-DE")}`,
    created_by: user.id,
  })

  return NextResponse.json({ lead: updatedLead })
}
