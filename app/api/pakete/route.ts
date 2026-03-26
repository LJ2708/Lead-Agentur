import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// GET    - List active packages (public, no auth needed)
// POST   - Create package (admin only)
// PATCH  - Update package (admin only)
// DELETE - Soft-delete package (admin only)
// ---------------------------------------------------------------------------

export async function GET() {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('lead_pakete')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[pakete/get] Query error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Admin only
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, beschreibung, leads_pro_monat, preis_pro_lead_cents, stripe_price_id, sort_order } = body as {
    name?: string
    beschreibung?: string
    leads_pro_monat?: number
    preis_pro_lead_cents?: number
    stripe_price_id?: string
    sort_order?: number
  }

  if (!name || leads_pro_monat == null || preis_pro_lead_cents == null) {
    return NextResponse.json(
      { error: 'Missing required fields: name, leads_pro_monat, preis_pro_lead_cents' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('lead_pakete')
    .insert({
      name,
      beschreibung: beschreibung ?? null,
      leads_pro_monat,
      preis_pro_lead_cents,
      stripe_price_id: stripe_price_id ?? null,
      sort_order: sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('[pakete/post] Insert error:', error.message)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const paketId = body.id as string
  if (!paketId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const updateData: Database['public']['Tables']['lead_pakete']['Update'] = {}
  if (body.name !== undefined) updateData.name = body.name as string
  if (body.beschreibung !== undefined) updateData.beschreibung = body.beschreibung as string | null
  if (body.leads_pro_monat !== undefined) updateData.leads_pro_monat = body.leads_pro_monat as number
  if (body.preis_pro_lead_cents !== undefined) updateData.preis_pro_lead_cents = body.preis_pro_lead_cents as number
  if (body.stripe_price_id !== undefined) updateData.stripe_price_id = body.stripe_price_id as string | null
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order as number
  if (body.is_active !== undefined) updateData.is_active = body.is_active as boolean

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('lead_pakete')
    .update(updateData)
    .eq('id', paketId)
    .select()
    .single()

  if (error) {
    console.error('[pakete/patch] Update error:', error.message)
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const paketId = searchParams.get('id')

  if (!paketId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Soft delete
  const { data, error } = await admin
    .from('lead_pakete')
    .update({ is_active: false })
    .eq('id', paketId)
    .select()
    .single()

  if (error) {
    console.error('[pakete/delete] Soft-delete error:', error.message)
    return NextResponse.json({ error: 'Failed to deactivate package' }, { status: 500 })
  }

  return NextResponse.json({ data })
}
