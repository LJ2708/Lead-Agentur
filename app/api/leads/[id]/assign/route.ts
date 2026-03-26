import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// POST - Manually assign a lead to a specific berater (admin only)
// ---------------------------------------------------------------------------

interface AssignBody {
  berater_id: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params
  const supabase = await createClient()

  // --- Auth: admin only ---------------------------------------------------
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 })
  }

  // --- Parse body ---------------------------------------------------------
  let body: AssignBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.berater_id) {
    return NextResponse.json({ error: 'Missing berater_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  // --- Validate lead exists -----------------------------------------------
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('id, status, berater_id')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // --- Validate berater exists and is active ------------------------------
  const { data: berater, error: beraterError } = await admin
    .from('berater')
    .select('id, profile_id, status, leads_geliefert')
    .eq('id', body.berater_id)
    .single()

  if (beraterError || !berater) {
    return NextResponse.json({ error: 'Berater not found' }, { status: 404 })
  }

  if (berater.status !== 'aktiv') {
    return NextResponse.json(
      { error: 'Berater is not active', berater_status: berater.status },
      { status: 422 }
    )
  }

  const now = new Date().toISOString()

  // --- If lead was previously assigned, close old assignment ---------------
  if (lead.berater_id) {
    await admin
      .from('lead_assignments')
      .update({ is_active: false })
      .eq('lead_id', leadId)
      .eq('berater_id', lead.berater_id)
      .eq('is_active', true)

    // Decrement old berater's leads_geliefert
    const { data: oldBerater } = await admin
      .from('berater')
      .select('leads_geliefert')
      .eq('id', lead.berater_id)
      .single()

    if (oldBerater) {
      await admin
        .from('berater')
        .update({ leads_geliefert: Math.max(0, oldBerater.leads_geliefert - 1) })
        .eq('id', lead.berater_id)
    }
  }

  // --- Assign lead to new berater -----------------------------------------
  const { error: updateError } = await admin
    .from('leads')
    .update({
      berater_id: berater.id,
      zugewiesen_am: now,
      status: 'zugewiesen',
    })
    .eq('id', leadId)

  if (updateError) {
    console.error('[assign] Lead update failed:', updateError.message)
    return NextResponse.json({ error: 'Failed to assign lead' }, { status: 500 })
  }

  // Increment new berater's leads_geliefert
  await admin
    .from('berater')
    .update({ leads_geliefert: berater.leads_geliefert + 1, letzte_zuweisung: now })
    .eq('id', berater.id)

  // Create assignment record
  await admin.from('lead_assignments').insert({
    lead_id: leadId,
    berater_id: berater.id,
    reason: 'Manuelle Zuweisung durch Admin',
    is_active: true,
  })

  // Create activity
  await admin.from('lead_activities').insert({
    lead_id: leadId,
    type: 'zuweisung',
    title: 'Manuelle Zuweisung',
    description: `Lead manuell an Berater zugewiesen (Admin: ${user.email})`,
    created_by: user.id,
  })

  return NextResponse.json({
    success: true,
    lead_id: leadId,
    berater_id: berater.id,
  })
}
