import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributeLeadToBerater } from '@/lib/routing/engine'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// GET  - Meta webhook verification (hub.mode, hub.verify_token, hub.challenge)
// POST - Receive Meta Lead Ad data
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 403 })
  }

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN
  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 })
  }

  // Must return the challenge as plain text with 200
  return new NextResponse(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    console.error('[meta-webhook] Missing META_APP_SECRET')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // --- Verify X-Hub-Signature-256 ----------------------------------------
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // --- Parse body ---------------------------------------------------------
  let body: MetaWebhookPayload
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Process each entry / change asynchronously but return 200 immediately
  // (Meta expects a fast 200 response)
  const processingPromises: Promise<void>[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const value = change.value
      if (!value?.leadgen_id) continue

      processingPromises.push(
        processMetaLead(supabase, value).catch((err) => {
          console.error('[meta-webhook] Error processing lead:', err)
        })
      )
    }
  }

  // Fire-and-forget: don't await, return 200 immediately
  // Use waitUntil-style pattern by catching at the top level
  Promise.allSettled(processingPromises).catch(() => {})

  return NextResponse.json({ received: true }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    time: number
    changes?: Array<{
      field: string
      value: MetaLeadgenValue
    }>
  }>
}

interface MetaLeadgenValue {
  leadgen_id: string
  form_id?: string
  ad_id?: string
  adgroup_id?: string
  campaign_id?: string
  page_id?: string
  created_time?: number
  field_data?: Array<{ name: string; values: string[] }>
}

// ---------------------------------------------------------------------------
// Lead processing
// ---------------------------------------------------------------------------

async function processMetaLead(
  supabase: ReturnType<typeof createAdminClient>,
  value: MetaLeadgenValue
): Promise<void> {
  const metaLeadId = value.leadgen_id

  // Deduplicate by meta_lead_id
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('meta_lead_id', metaLeadId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    console.log(`[meta-webhook] Duplicate meta_lead_id=${metaLeadId}, skipping`)
    return
  }

  // Extract fields from Meta's field_data array
  const fields = new Map<string, string>()
  for (const fd of value.field_data ?? []) {
    if (fd.values?.[0]) {
      fields.set(fd.name.toLowerCase(), fd.values[0])
    }
  }

  const vorname = fields.get('first_name') ?? fields.get('vorname') ?? 'Unbekannt'
  const nachname = fields.get('last_name') ?? fields.get('nachname') ?? 'Unbekannt'
  const email = fields.get('email') ?? ''
  const telefon = fields.get('phone_number') ?? fields.get('telefon') ?? null

  if (!email) {
    console.warn(`[meta-webhook] Lead ${metaLeadId} has no email, inserting anyway`)
  }

  // Build custom_fields with anything we don't explicitly map
  const knownKeys = new Set([
    'first_name', 'last_name', 'vorname', 'nachname',
    'email', 'phone_number', 'telefon', 'city', 'stadt',
    'zip', 'zip_code', 'plz',
  ])
  const customFields: Record<string, string> = {}
  fields.forEach((val, key) => {
    if (!knownKeys.has(key)) {
      customFields[key] = val
    }
  })

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      vorname,
      nachname,
      email,
      telefon,
      source: 'meta_lead_ad',
      status: 'neu',
      meta_lead_id: metaLeadId,
      form_id: value.form_id ?? null,
      campaign: value.campaign_id ?? null,
      custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
    })
    .select('id')
    .single()

  if (insertError || !lead) {
    console.error('[meta-webhook] Failed to insert lead:', insertError?.message)
    throw new Error(`Insert failed: ${insertError?.message}`)
  }

  // Create initial activity
  await supabase.from('lead_activities').insert({
    lead_id: lead.id,
    type: 'system',
    title: 'Meta Lead Ad',
    description: 'Lead via Meta Lead Ad empfangen',
  })

  // Distribute to berater
  try {
    await distributeLeadToBerater(lead.id)
  } catch (err) {
    console.error(`[meta-webhook] Distribution failed for lead ${lead.id}:`, err)
    // Lead is created; distribution can be retried via cron
  }
}
