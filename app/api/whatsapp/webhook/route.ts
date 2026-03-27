import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// GET  - WhatsApp webhook verification
// POST - Process incoming WhatsApp messages and status updates
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 403 })
  }

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? process.env.META_WEBHOOK_VERIFY_TOKEN
  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 })
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

export async function POST(request: NextRequest) {
  let body: WhatsAppWebhookPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createAdminClient()

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue
      const value = change.value

      // --- Process status updates (sent, delivered, read) -----------------
      for (const status of value.statuses ?? []) {
        await processStatusUpdate(supabase, status)
      }

      // --- Process incoming messages --------------------------------------
      for (const message of value.messages ?? []) {
        await processIncomingMessage(supabase, message, value.metadata?.display_phone_number)
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhatsAppWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    changes?: Array<{
      field: string
      value: {
        messaging_product: string
        metadata?: { display_phone_number?: string; phone_number_id?: string }
        statuses?: WhatsAppStatus[]
        messages?: WhatsAppMessage[]
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>
      }
    }>
  }>
}

interface WhatsAppStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: Array<{ code: number; title: string }>
}

interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'reaction' | 'interactive' | 'button'
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  button?: { text: string; payload: string }
  interactive?: { type: string; button_reply?: { id: string; title: string } }
}

// ---------------------------------------------------------------------------
// Status update handler
// ---------------------------------------------------------------------------

async function processStatusUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  status: WhatsAppStatus
) {
  const updateData: Record<string, unknown> = {}

  if (status.status === 'delivered') {
    updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString()
  } else if (status.status === 'read') {
    updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString()
  } else if (status.status === 'failed' && status.errors?.length) {
    updateData.error = status.errors.map((e) => `${e.code}: ${e.title}`).join('; ')
  }

  if (Object.keys(updateData).length === 0) return

  // Update nachrichten record by whatsapp_message_id
  const { error } = await supabase
    .from('nachrichten')
    .update(updateData)
    .eq('whatsapp_message_id', status.id)

  if (error) {
    console.error(`[whatsapp-webhook] Failed to update status for message ${status.id}:`, error.message)
  }
}

// ---------------------------------------------------------------------------
// Incoming message handler
// ---------------------------------------------------------------------------

async function processIncomingMessage(
  supabase: ReturnType<typeof createAdminClient>,
  message: WhatsAppMessage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _displayPhoneNumber?: string
) {
  const senderPhone = message.from

  // Try to find a lead by phone number (normalize: WhatsApp sends without +)
  const possibleFormats = [
    senderPhone,
    `+${senderPhone}`,
    `0${senderPhone.replace(/^49/, '')}`, // German local format
  ]

  let leadId: string | null = null



  for (const phone of possibleFormats) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, berater_id')
      .eq('telefon', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lead) {
      leadId = lead.id
      break
    }
  }

  if (!leadId) {
    console.log(`[whatsapp-webhook] No lead found for phone ${senderPhone}, ignoring`)
    return
  }

  // Determine message content
  let messageBody = ''
  if (message.type === 'text' && message.text?.body) {
    messageBody = message.text.body
  } else if (message.type === 'button' && message.button) {
    messageBody = `[Button] ${message.button.text}`
  } else if (message.type === 'interactive' && message.interactive?.button_reply) {
    messageBody = `[Interactive] ${message.interactive.button_reply.title}`
  } else {
    messageBody = `[${message.type}]`
  }

  // Create nachrichten record for inbound message
  await supabase.from('nachrichten').insert({
    lead_id: leadId,
    channel: 'whatsapp',
    direction: 'eingehend',
    body: messageBody,
    whatsapp_message_id: message.id,
  })

  // Update lead's erster_kontakt_am if not set
  await supabase
    .from('leads')
    .update({ erster_kontakt_am: new Date().toISOString() })
    .eq('id', leadId)
    .is('erster_kontakt_am', null)
}
