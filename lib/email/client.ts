import { Resend } from 'resend'
import { emailLayout, emailButton } from './templates'

let resend: Resend | null = null

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
} else {
  console.warn('[email] RESEND_API_KEY nicht gesetzt — E-Mails werden nicht versendet.')
}

const FROM = process.env.EMAIL_FROM || 'LeadSolution <noreply@leadsolution.de>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hub.leadsolution.de'

// ---------------------------------------------------------------------------
// Generic send helper
// ---------------------------------------------------------------------------

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.warn('[email] Kein RESEND_API_KEY — E-Mail nicht gesendet:', subject)
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('[email] Fehler beim Senden:', error.message)
      return false
    }

    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('[email] Unerwarteter Fehler:', message)
    return false
  }
}

// ---------------------------------------------------------------------------
// Template: Lead zugewiesen an Berater
// ---------------------------------------------------------------------------

export async function sendLeadZugewiesenEmail(
  to: string,
  data: {
    beraterName: string
    leadName: string
    leadEmail?: string
    leadPhone?: string
  }
): Promise<boolean> {
  const rows = [
    { label: 'Name', value: data.leadName },
    ...(data.leadPhone ? [{ label: 'Telefon', value: data.leadPhone }] : []),
    ...(data.leadEmail ? [{ label: 'E-Mail', value: data.leadEmail }] : []),
  ]

  const tableRows = rows
    .map(
      (r, i) =>
        `<tr>
          <td style="padding: 10px 14px; font-weight: 600; background-color: ${i % 2 === 0 ? '#f4f4f5' : '#ffffff'};">${r.label}</td>
          <td style="padding: 10px 14px; background-color: ${i % 2 === 0 ? '#f4f4f5' : '#ffffff'};">${r.value}</td>
        </tr>`
    )
    .join('')

  const html = emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">Hallo ${data.beraterName},</h2>
    <p>Dir wurde ein neuer Lead zugewiesen:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; margin: 16px 0;">
      ${tableRows}
    </table>
    <p>Bitte kontaktiere den Lead so schnell wie m&ouml;glich.</p>
    ${emailButton('Lead ansehen', `${APP_URL}/dashboard/leads`)}
  `)

  return sendEmail(to, `Neuer Lead: ${data.leadName}`, html)
}

// ---------------------------------------------------------------------------
// Template: SLA Warnung
// ---------------------------------------------------------------------------

export async function sendSlaWarningEmail(
  to: string,
  data: {
    beraterName: string
    leadName: string
    minutesLeft: number
  }
): Promise<boolean> {
  const html = emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">SLA-Warnung</h2>
    <p>Hallo ${data.beraterName},</p>
    <p style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <strong>Achtung:</strong> F&uuml;r den Lead <strong>${data.leadName}</strong> verbleiben nur noch
      <strong>${data.minutesLeft} Minuten</strong> bis zum SLA-Ablauf.
    </p>
    <p>Bitte nimm umgehend Kontakt auf, um eine R&uuml;ckvergabe zu vermeiden.</p>
    ${emailButton('Lead ansehen', `${APP_URL}/dashboard/leads`)}
  `)

  return sendEmail(to, `SLA-Warnung: ${data.leadName} — ${data.minutesLeft} Min. verbleibend`, html)
}

// ---------------------------------------------------------------------------
// Template: Berater Einladung
// ---------------------------------------------------------------------------

export async function sendBeraterInviteEmail(
  to: string,
  data: {
    name: string
    inviteUrl: string
  }
): Promise<boolean> {
  const html = emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">Willkommen bei LeadSolution!</h2>
    <p>Hallo ${data.name},</p>
    <p>Du wurdest als Berater zu <strong>LeadSolution</strong> eingeladen. Klicke auf den Button unten, um dein Passwort festzulegen und dein Konto zu aktivieren:</p>
    ${emailButton('Konto aktivieren', data.inviteUrl)}
    <p style="color: #71717a; font-size: 13px;">Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>
  `)

  return sendEmail(to, 'Einladung zu LeadSolution', html)
}

// ---------------------------------------------------------------------------
// Template: Lead Reminder (30min ohne Kontakt)
// ---------------------------------------------------------------------------

export async function sendReminderEmail(
  to: string,
  data: {
    beraterName: string
    leadName: string
    leadPhone?: string
  }
): Promise<boolean> {
  const phoneInfo = data.leadPhone
    ? `<p>Telefon: <strong>${data.leadPhone}</strong></p>`
    : ''

  const html = emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">Erinnerung: Lead wartet</h2>
    <p>Hallo ${data.beraterName},</p>
    <p style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
      Dein Lead <strong>${data.leadName}</strong> wartet seit &uuml;ber 30 Minuten auf eine Kontaktaufnahme.
    </p>
    ${phoneInfo}
    <p>Bitte kontaktiere den Lead zeitnah, um die bestm&ouml;gliche Conversion zu erzielen.</p>
    ${emailButton('Lead ansehen', `${APP_URL}/dashboard/leads`)}
  `)

  return sendEmail(to, `Erinnerung: ${data.leadName} wartet auf Kontakt`, html)
}

// ---------------------------------------------------------------------------
// Template: Admin Alert (Warteschlange voll)
// ---------------------------------------------------------------------------

export async function sendAdminAlertEmail(
  to: string,
  data: {
    alertType: string
    message: string
    count?: number
  }
): Promise<boolean> {
  const countInfo = data.count !== undefined
    ? `<p style="font-size: 28px; font-weight: 700; color: #dc2626; margin: 16px 0;">${data.count}</p>`
    : ''

  const html = emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #dc2626;">Admin-Alert: ${data.alertType}</h2>
    ${countInfo}
    <p>${data.message}</p>
    ${emailButton('Admin-Panel &ouml;ffnen', `${APP_URL}/admin`)}
  `)

  return sendEmail(to, `[Alert] ${data.alertType}`, html)
}

// ---------------------------------------------------------------------------
// Template: Nachkauf Bestätigung
// ---------------------------------------------------------------------------

export async function sendNachkaufEmail(
  to: string,
  data: {
    beraterName: string
    anzahlLeads: number
    betrag: string
  }
): Promise<boolean> {
  const html = emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">Nachkauf best&auml;tigt</h2>
    <p>Hallo ${data.beraterName},</p>
    <p>Dein Nachkauf wurde erfolgreich verarbeitet:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f4f4f5;">Anzahl Leads</td>
        <td style="padding: 10px 14px; background-color: #f4f4f5;">${data.anzahlLeads}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600;">Betrag</td>
        <td style="padding: 10px 14px;">${data.betrag}</td>
      </tr>
    </table>
    <p>Die zus&auml;tzlichen Leads werden deinem Kontingent hinzugef&uuml;gt und in K&uuml;rze zugewiesen.</p>
    ${emailButton('Dashboard &ouml;ffnen', `${APP_URL}/dashboard`)}
  `)

  return sendEmail(to, `Nachkauf best\u00e4tigt: ${data.anzahlLeads} Leads`, html)
}

// ---------------------------------------------------------------------------
// Template: Willkommen nach Aktivierung
// ---------------------------------------------------------------------------

export async function sendWillkommenEmail(
  to: string,
  data: {
    name: string
    leads: number
    preisProLead: string
  }
): Promise<boolean> {
  const html = emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">Willkommen bei LeadSolution, ${data.name}!</h2>
    <p>Dein Konto ist jetzt aktiv. Hier eine &Uuml;bersicht deines Pakets:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f4f4f5;">Leads pro Monat</td>
        <td style="padding: 10px 14px; background-color: #f4f4f5;">${data.leads}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600;">Preis pro Lead</td>
        <td style="padding: 10px 14px;">${data.preisProLead}</td>
      </tr>
    </table>
    <p>Du erh&auml;ltst ab sofort qualifizierte Leads direkt in dein Dashboard. Wir empfehlen, Leads innerhalb von 15 Minuten zu kontaktieren, um die besten Ergebnisse zu erzielen.</p>
    ${emailButton('Zum Dashboard', `${APP_URL}/dashboard`)}
  `)

  return sendEmail(to, 'Willkommen bei LeadSolution — Dein Konto ist aktiv', html)
}
