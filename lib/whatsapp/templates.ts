/**
 * WhatsApp message template definitions.
 * Each template maps to a pre-approved template in the WhatsApp Business Manager.
 * Parameters correspond to {{1}}, {{2}}, etc. placeholders in the template body.
 */

export interface TemplateDefinition {
  name: string
  description: string
  parameters: string[]
}

export const WHATSAPP_TEMPLATES = {
  /**
   * Welcome message sent to a new lead after form submission.
   * Parameters: {{1}} lead first name, {{2}} berater name, {{3}} berater phone
   */
  lead_willkommen: {
    name: 'lead_willkommen',
    description: 'Willkommensnachricht an neuen Lead nach Formular-Eingang',
    parameters: ['lead_vorname', 'berater_name', 'berater_telefon'],
  },

  /**
   * Appointment confirmation after a termin is booked.
   * Parameters: {{1}} lead name, {{2}} date, {{3}} time, {{4}} berater name
   */
  termin_bestaetigung: {
    name: 'termin_bestaetigung',
    description: 'Bestätigung eines gebuchten Termins',
    parameters: ['lead_name', 'datum', 'uhrzeit', 'berater_name'],
  },

  /**
   * 24-hour reminder before the appointment.
   * Parameters: {{1}} lead name, {{2}} date, {{3}} time, {{4}} berater name
   */
  termin_erinnerung_24h: {
    name: 'termin_erinnerung_24h',
    description: 'Erinnerung 24 Stunden vor dem Termin',
    parameters: ['lead_name', 'datum', 'uhrzeit', 'berater_name'],
  },

  /**
   * 1-hour reminder before the appointment.
   * Parameters: {{1}} lead name, {{2}} uhrzeit, {{3}} berater name
   */
  termin_erinnerung_1h: {
    name: 'termin_erinnerung_1h',
    description: 'Erinnerung 1 Stunde vor dem Termin',
    parameters: ['lead_name', 'uhrzeit', 'berater_name'],
  },

  /**
   * No-show follow-up message after missed appointment.
   * Parameters: {{1}} lead name, {{2}} berater name, {{3}} reschedule link
   */
  no_show_nachfassung: {
    name: 'no_show_nachfassung',
    description: 'Nachfassung bei Nichterscheinen zum Termin',
    parameters: ['lead_name', 'berater_name', 'neuer_termin_link'],
  },

  /**
   * General follow-up message.
   * Parameters: {{1}} lead name, {{2}} berater name, {{3}} custom message
   */
  follow_up: {
    name: 'follow_up',
    description: 'Allgemeine Nachfass-Nachricht',
    parameters: ['lead_name', 'berater_name', 'nachricht'],
  },
} as const satisfies Record<string, TemplateDefinition>

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES

/**
 * Build parameter array for the WhatsApp Cloud API from a template and values.
 * Values must be provided in the same order as the template's parameters array.
 */
export function buildTemplateParameters(
  templateName: WhatsAppTemplateName,
  values: Record<string, string>
): Array<{ type: 'text'; text: string }> {
  const template = WHATSAPP_TEMPLATES[templateName]

  return template.parameters.map((paramName) => {
    const value = values[paramName]
    if (!value) {
      console.warn(
        `[whatsapp] Missing parameter "${paramName}" for template "${templateName}"`
      )
    }
    return {
      type: 'text' as const,
      text: value ?? '',
    }
  })
}
