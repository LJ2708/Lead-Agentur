import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// GET - List leads with pagination, search, status filter, sorting
// ---------------------------------------------------------------------------

type LeadStatus = Database['public']['Enums']['lead_status']

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // --- Auth ---------------------------------------------------------------
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Load profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  // --- Query params -------------------------------------------------------
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)))
  const status = searchParams.get('status') as LeadStatus | null
  const search = searchParams.get('search')?.trim() ?? null
  const sort = searchParams.get('sort') ?? 'created_at'
  const order = searchParams.get('order') === 'asc' ? true : false // ascending
  const offset = (page - 1) * limit

  // --- Build query --------------------------------------------------------
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })

  // Role-based filtering
  if (profile.role === 'berater') {
    // Berater sees only leads assigned to their berater record
    const { data: berater } = await supabase
      .from('berater')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!berater) {
      return NextResponse.json({ data: [], total: 0, page, limit })
    }
    query = query.eq('berater_id', berater.id)
  } else if (profile.role === 'setter') {
    // Setter sees leads assigned to them via setter_id
    query = query.eq('setter_id', user.id)
  }
  // admin and teamleiter see all leads (no additional filter)

  // Status filter
  if (status) {
    query = query.eq('status', status)
  }

  // Search across vorname, nachname, email, telefon
  if (search) {
    query = query.or(
      `vorname.ilike.%${search}%,nachname.ilike.%${search}%,email.ilike.%${search}%,telefon.ilike.%${search}%`
    )
  }

  // Sorting
  const allowedSortFields = [
    'created_at', 'updated_at', 'vorname', 'nachname',
    'email', 'status', 'zugewiesen_am', 'score',
  ]
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at'
  query = query.order(sortField, { ascending: order })

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[leads] Query error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}
