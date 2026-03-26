import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY environment variable')
}

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM ?? 'LeadSolution <noreply@leadsolution.de>'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
}

interface SendEmailResult {
  id: string | null
  error: string | null
}

/**
 * Generic email send helper.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    if (error) {
      console.error('[email] Send failed:', error.message)
      return { id: null, error: error.message }
    }

    return { id: data?.id ?? null, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email] Unexpected error:', message)
    return { id: null, error: message }
  }
}

/**
 * Notify berater that a new lead was assigned.
 */
export async function sendLeadZugewiesenEmail(params: {
  beraterEmail: string
  beraterName: string
  leadName: string
  leadTelefon: string
  leadOrt: string
  isNachkauf: boolean
}): Promise<SendEmailResult> {
  const { beraterEmail, beraterName, leadName, leadTelefon, leadOrt, isNachkauf } = params

  const subject = isNachkauf
    ? `Nachkauf-Lead: ${leadName} aus ${leadOrt}`
    : `Neuer Lead: ${leadName} aus ${leadOrt}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Hallo ${beraterName},</h2>
      <p>Dir wurde ein neuer ${isNachkauf ? 'Nachkauf-' : ''}Lead zugewiesen:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Name</td>
          <td style="padding: 8px 12px; background: #f5f5f5;">${leadName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold;">Telefon</td>
          <td style="padding: 8px 12px;">${leadTelefon}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Ort</td>
          <td style="padding: 8px 12px; background: #f5f5f5;">${leadOrt}</td>
        </tr>
      </table>
      <p>Bitte kontaktiere den Lead so schnell wie möglich.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads"
         style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 12px;">
        Lead ansehen
      </a>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Diese E-Mail wurde automatisch von LeadSolution versendet.
      </p>
    </div>
  `

  return sendEmail({ to: beraterEmail, subject, html })
}

/**
 * Send a reminder to follow up on a lead.
 */
export async function sendReminderEmail(params: {
  beraterEmail: string
  beraterName: string
  leadName: string
  erinnerungsTyp: string
}): Promise<SendEmailResult> {
  const { beraterEmail, beraterName, leadName, erinnerungsTyp } = params

  const subject = `Erinnerung: ${leadName} - ${erinnerungsTyp}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Hallo ${beraterName},</h2>
      <p>Erinnerung für deinen Lead <strong>${leadName}</strong>:</p>
      <p style="padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        ${erinnerungsTyp}
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads"
         style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 12px;">
        Lead ansehen
      </a>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Diese E-Mail wurde automatisch von LeadSolution versendet.
      </p>
    </div>
  `

  return sendEmail({ to: beraterEmail, subject, html })
}

/**
 * Send an alert to the admin team.
 */
export async function sendAdminAlertEmail(params: {
  subject: string
  nachricht: string
  details?: Record<string, unknown>
}): Promise<SendEmailResult> {
  const { subject, nachricht, details } = params
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@leadsolution.de'

  const detailsHtml = details
    ? `<pre style="padding: 12px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 13px;">${JSON.stringify(details, null, 2)}</pre>`
    : ''

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Admin Alert</h2>
      <p>${nachricht}</p>
      ${detailsHtml}
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin"
         style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin-top: 12px;">
        Admin-Panel öffnen
      </a>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        LeadSolution System-Benachrichtigung
      </p>
    </div>
  `

  return sendEmail({ to: adminEmail, subject: `[Alert] ${subject}`, html })
}
