import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributeLeadToBerater } from '@/lib/routing/engine'

// ---------------------------------------------------------------------------
// POST - Receive lead from a landing page form
// ---------------------------------------------------------------------------

interface LandingpageBody {
  vorname: string
  nachname: string
  email: string
  telefon?: string | null
  opt_in_email?: boolean
  opt_in_whatsapp?: boolean
  opt_in_telefon?: boolean
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  custom_fields?: Record<string, unknown> | null
}

export async function POST(request: NextRequest) {
  // --- API key validation -------------------------------------------------
  const apiKey = request.headers.get('x-api-key')
  const secretKey = process.env.API_SECRET_KEY

  if (!secretKey || apiKey !== secretKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse & validate body ----------------------------------------------
  let body: LandingpageBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { vorname, nachname, email, telefon } = body

  if (!vorname || !nachname || !email) {
    return NextResponse.json(
      { error: 'Missing required fields: vorname, nachname, email' },
      { status: 400 }
    )
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // --- Deduplicate: same email+telefon within last 24 h -------------------
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  let dupeQuery = supabase
    .from('leads')
    .select('id')
    .eq('email', email)
    .gte('created_at', twentyFourHoursAgo)
    .limit(1)

  if (telefon) {
    dupeQuery = dupeQuery.eq('telefon', telefon)
  }

  const { data: existing } = await dupeQuery.maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Duplicate lead', lead_id: existing.id },
      { status: 409 }
    )
  }

  // --- Insert lead --------------------------------------------------------
  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      vorname,
      nachname,
      email,
      telefon: telefon ?? null,
      source: 'landingpage',
      status: 'neu',
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_content: body.utm_content ?? null,
      opt_in_email: body.opt_in_email ?? false,
      opt_in_whatsapp: body.opt_in_whatsapp ?? false,
      opt_in_telefon: body.opt_in_telefon ?? false,
      custom_fields: (body.custom_fields as Record<string, string> | null) ?? null,
    })
    .select('id')
    .single()

  if (insertError || !lead) {
    console.error('[landingpage-webhook] Insert failed:', insertError?.message)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }

  // Create activity log
  await supabase.from('lead_activities').insert({
    lead_id: lead.id,
    type: 'system',
    title: 'Landingpage',
    description: 'Lead via Landingpage empfangen',
  })

  // --- Distribute ---------------------------------------------------------
  try {
    await distributeLeadToBerater(lead.id)
  } catch (err) {
    console.error(`[landingpage-webhook] Distribution failed for lead ${lead.id}:`, err)
    // Lead is created; distribution can be retried
  }

  return NextResponse.json({ lead_id: lead.id }, { status: 201 })
}
