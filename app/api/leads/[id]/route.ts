import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// PATCH - Update a lead (status, fields) with status transition validation
// ---------------------------------------------------------------------------

type LeadStatus = Database['public']['Enums']['lead_status']

// Allowed status transitions map
const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  neu: ['zugewiesen', 'warteschlange'],
  warteschlange: ['zugewiesen'],
  zugewiesen: ['kontaktversuch', 'nicht_erreicht', 'qualifiziert', 'verloren', 'warteschlange'],
  kontaktversuch: ['nicht_erreicht', 'qualifiziert', 'termin', 'verloren', 'nachfassen'],
  nicht_erreicht: ['kontaktversuch', 'nachfassen', 'verloren', 'warteschlange'],
  qualifiziert: ['termin', 'verloren', 'nachfassen'],
  termin: ['show', 'no_show', 'verloren'],
  show: ['abschluss', 'nachfassen', 'verloren'],
  no_show: ['nachfassen', 'termin', 'verloren'],
  nachfassen: ['kontaktversuch', 'termin', 'qualifiziert', 'verloren'],
  abschluss: [], // terminal
  verloren: ['nachfassen'], // can be revived
}

interface PatchBody {
  status?: LeadStatus
  naechste_erinnerung?: string
  erster_kontakt_am?: string
  kontaktversuche?: number
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // --- Auth ---------------------------------------------------------------
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse body ---------------------------------------------------------
  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // --- Load current lead --------------------------------------------------
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // --- Check access -------------------------------------------------------
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  // Non-admins can only edit their own leads
  if (profile.role !== 'admin' && profile.role !== 'teamleiter') {
    // Check if berater owns this lead
    const { data: berater } = await supabase
      .from('berater')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    const isOwner = berater && lead.berater_id === berater.id

    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // --- Validate status transition -----------------------------------------
  const oldStatus = lead.status as LeadStatus
  const newStatus = body.status

  if (newStatus && newStatus !== oldStatus) {
    const allowed = VALID_TRANSITIONS[oldStatus] ?? []
    // Admins can override transition rules
    if (profile.role !== 'admin' && !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${oldStatus}' to '${newStatus}'`,
          allowed_transitions: allowed,
        },
        { status: 422 }
      )
    }
  }

  // --- Build update payload -----------------------------------------------
  const updateData: Database['public']['Tables']['leads']['Update'] = {}

  if (body.status) updateData.status = body.status
  if (body.naechste_erinnerung !== undefined) updateData.naechste_erinnerung = body.naechste_erinnerung
  if (body.erster_kontakt_am !== undefined) updateData.erster_kontakt_am = body.erster_kontakt_am
  if (body.kontaktversuche !== undefined) updateData.kontaktversuche = body.kontaktversuche

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[leads/patch] Update error:', updateError.message)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }

  // --- Create activity log on status change --------------------------------
  if (newStatus && newStatus !== oldStatus) {
    await supabase.from('lead_activities').insert({
      lead_id: id,
      type: 'status_change',
      title: 'Status geaendert',
      description: `Status von '${oldStatus}' auf '${newStatus}' geaendert`,
      old_value: oldStatus,
      new_value: newStatus,
      created_by: user.id,
    })
  }

  return NextResponse.json({ data: updated })
}
