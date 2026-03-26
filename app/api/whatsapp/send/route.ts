import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTemplate } from '@/lib/whatsapp/client'
import { WHATSAPP_TEMPLATES, buildTemplateParameters } from '@/lib/whatsapp/templates'
import type { WhatsAppTemplateName } from '@/lib/whatsapp/templates'

// ---------------------------------------------------------------------------
// POST - Send a WhatsApp template message to a lead
// Body: { lead_id, template_name, parameters? }
// ---------------------------------------------------------------------------

interface SendBody {
  lead_id: string
  template_name: string
  parameters?: Record<string, string>
}

export async function POST(request: NextRequest) {
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
  let body: SendBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.lead_id || !body.template_name) {
    return NextResponse.json(
      { error: 'Missing required fields: lead_id, template_name' },
      { status: 400 }
    )
  }

  // Validate template name
  if (!(body.template_name in WHATSAPP_TEMPLATES)) {
    return NextResponse.json(
      { error: `Unknown template: ${body.template_name}`, available: Object.keys(WHATSAPP_TEMPLATES) },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // --- Load lead ----------------------------------------------------------
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('id, vorname, nachname, telefon, opt_in_whatsapp')
    .eq('id', body.lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  if (!lead.telefon) {
    return NextResponse.json({ error: 'Lead has no phone number' }, { status: 422 })
  }

  // --- Check WhatsApp opt-in ----------------------------------------------
  if (!lead.opt_in_whatsapp) {
    return NextResponse.json(
      { error: 'Lead has not opted in to WhatsApp messages' },
      { status: 422 }
    )
  }

  // --- Get berater info for template parameters ---------------------------
  const { data: berater } = await admin
    .from('berater')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .single()

  const { data: beraterProfile } = berater
    ? await admin.from('profiles').select('full_name, phone').eq('id', berater.profile_id).single()
    : { data: null }

  // --- Build template parameters ------------------------------------------
  const templateName = body.template_name as WhatsAppTemplateName
  const templateParams = body.parameters ?? {
    lead_vorname: lead.vorname ?? '',
    lead_name: `${lead.vorname ?? ''} ${lead.nachname ?? ''}`,
    berater_name: beraterProfile?.full_name ?? '',
    berater_telefon: beraterProfile?.phone ?? '',
  }

  const params = buildTemplateParameters(templateName, templateParams)

  // --- Send WhatsApp message ----------------------------------------------
  const result = await sendTemplate(lead.telefon, templateName, params)

  // --- Create nachrichten record ------------------------------------------
  await admin.from('nachrichten').insert({
    lead_id: lead.id,
    channel: 'whatsapp',
    direction: 'ausgehend',
    body: `Template: ${body.template_name}`,
    template_id: body.template_name,
    whatsapp_message_id: result.messageId ?? null,
    sent_at: result.success ? new Date().toISOString() : null,
    error: result.error ?? null,
    created_by: user.id,
  })

  if (!result.success) {
    return NextResponse.json(
      { error: 'WhatsApp send failed', details: result.error },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message_id: result.messageId,
  })
}
