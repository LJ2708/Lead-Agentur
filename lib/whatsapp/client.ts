const GRAPH_API_VERSION = 'v21.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

interface WhatsAppResponse {
  success: boolean
  messageId: string | null
  error: string | null
}

interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
}

interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  sub_type?: 'quick_reply' | 'url'
  index?: number
  parameters: TemplateParameter[]
}

/**
 * Send a WhatsApp template message via the Cloud API.
 */
export async function sendTemplate(
  phoneNumber: string,
  templateName: string,
  parameters: TemplateParameter[],
  language: string = 'de'
): Promise<WhatsAppResponse> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return { success: false, messageId: null, error: 'Missing WhatsApp configuration' }
  }

  // Normalize phone number: remove spaces, dashes, ensure + prefix
  const normalizedPhone = normalizePhoneNumber(phoneNumber)

  const components: TemplateComponent[] = parameters.length > 0
    ? [{ type: 'body', parameters }]
    : []

  const body = {
    messaging_product: 'whatsapp',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data?.error?.message ?? `HTTP ${response.status}`
      console.error('[whatsapp] API error:', errorMessage, data)
      return { success: false, messageId: null, error: errorMessage }
    }

    const messageId = data?.messages?.[0]?.id ?? null
    return { success: true, messageId, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[whatsapp] Request failed:', message)
    return { success: false, messageId: null, error: message }
  }
}

/**
 * Send a WhatsApp template with header and body components.
 */
export async function sendTemplateWithComponents(
  phoneNumber: string,
  templateName: string,
  components: TemplateComponent[],
  language: string = 'de'
): Promise<WhatsAppResponse> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    return { success: false, messageId: null, error: 'Missing WhatsApp configuration' }
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber)

  const body = {
    messaging_product: 'whatsapp',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data?.error?.message ?? `HTTP ${response.status}`
      return { success: false, messageId: null, error: errorMessage }
    }

    const messageId = data?.messages?.[0]?.id ?? null
    return { success: true, messageId, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, messageId: null, error: message }
  }
}

/**
 * Normalize a phone number for WhatsApp API.
 * Removes spaces, dashes, parentheses. Converts German format to international.
 */
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')

  // Convert German local format to international
  if (cleaned.startsWith('0')) {
    cleaned = '49' + cleaned.substring(1)
  }

  // Remove + prefix (WhatsApp API expects number without +)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  return cleaned
}
