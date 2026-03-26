import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// GET  - List berater (admin: all, others: own record)
// PATCH - Update berater (admin: any, berater: pause/unpause own)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createClient()

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

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  const admin = createAdminClient()

  if (profile.role === 'admin' || profile.role === 'teamleiter') {
    // Return all berater with joined profile data
    const { data, error } = await admin
      .from('berater')
      .select('*, profiles:profile_id(id, email, full_name, phone)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[berater/get] Query error:', error.message)
      return NextResponse.json({ error: 'Failed to fetch berater' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  }

  // Non-admin: return own berater record
  const { data: berater, error } = await admin
    .from('berater')
    .select('*, profiles:profile_id(id, email, full_name, phone)')
    .eq('profile_id', user.id)
    .single()

  if (error || !berater) {
    return NextResponse.json({ error: 'Berater record not found' }, { status: 404 })
  }

  return NextResponse.json({ data: berater })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

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

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (profile.role === 'admin') {
    // Admin can update any berater - berater_id required in body
    const beraterId = body.berater_id as string
    if (!beraterId) {
      return NextResponse.json({ error: 'Missing berater_id' }, { status: 400 })
    }

    const updateData: Database['public']['Tables']['berater']['Update'] = {}
    if (body.status !== undefined) updateData.status = body.status as Database['public']['Enums']['berater_status']
    if (body.leads_kontingent !== undefined) updateData.leads_kontingent = body.leads_kontingent as number
    if (body.hat_setter !== undefined) updateData.hat_setter = body.hat_setter as boolean
    if (body.lead_paket_id !== undefined) updateData.lead_paket_id = body.lead_paket_id as string | null
    if (body.assigned_setter_id !== undefined) updateData.assigned_setter_id = body.assigned_setter_id as string | null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await admin
      .from('berater')
      .update(updateData)
      .eq('id', beraterId)
      .select()
      .single()

    if (updateError) {
      console.error('[berater/patch] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to update berater' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  }

  // Non-admin berater: can only pause/unpause own record
  const { data: ownBerater } = await admin
    .from('berater')
    .select('id, status')
    .eq('profile_id', user.id)
    .single()

  if (!ownBerater) {
    return NextResponse.json({ error: 'Berater record not found' }, { status: 404 })
  }

  const newStatus = body.status as Database['public']['Enums']['berater_status'] | undefined

  if (!newStatus || !['aktiv', 'pausiert'].includes(newStatus)) {
    return NextResponse.json(
      { error: 'Berater can only toggle between aktiv and pausiert' },
      { status: 422 }
    )
  }

  // Can only pause if active, and unpause if paused
  if (
    (newStatus === 'pausiert' && ownBerater.status !== 'aktiv') ||
    (newStatus === 'aktiv' && ownBerater.status !== 'pausiert')
  ) {
    return NextResponse.json(
      { error: `Cannot change from '${ownBerater.status}' to '${newStatus}'` },
      { status: 422 }
    )
  }

  const { data: updated, error: updateError } = await admin
    .from('berater')
    .update({ status: newStatus })
    .eq('id', ownBerater.id)
    .select()
    .single()

  if (updateError) {
    console.error('[berater/patch] Self-update error:', updateError.message)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }

  return NextResponse.json({ data: updated })
}
