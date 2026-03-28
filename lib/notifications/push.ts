export interface PushNotification {
  type:
    | "new_lead"
    | "sla_warning"
    | "sla_breach"
    | "lead_reassigned"
    | "appointment_reminder"
    | "performance_update"
  title: string
  body: string
  data?: Record<string, string>
  urgency: "high" | "normal" | "low"
}

type NotificationType = PushNotification["type"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateFactory = (data: any) => PushNotification

export const NOTIFICATION_TEMPLATES: Record<NotificationType, TemplateFactory> =
  {
    new_lead: (data: { name: string; lead_id?: string }) => ({
      type: "new_lead",
      title: `Neuer Lead: ${data.name}`,
      body: "Bitte innerhalb von 30 Minuten kontaktieren",
      data: data.lead_id ? { lead_id: data.lead_id } : undefined,
      urgency: "high",
    }),

    sla_warning: (data: { name: string; minutes: number; lead_id?: string }) => ({
      type: "sla_warning",
      title: "SLA läuft ab!",
      body: `${data.name} \u2013 noch ${data.minutes} Minuten`,
      data: data.lead_id ? { lead_id: data.lead_id } : undefined,
      urgency: "high",
    }),

    sla_breach: (data: { name: string; lead_id?: string }) => ({
      type: "sla_breach",
      title: "SLA überschritten",
      body: `Lead ${data.name} wird umverteilt`,
      data: data.lead_id ? { lead_id: data.lead_id } : undefined,
      urgency: "high",
    }),

    lead_reassigned: (data: { name: string; lead_id?: string }) => ({
      type: "lead_reassigned",
      title: "Lead umverteilt",
      body: `${data.name} wurde Ihnen zugewiesen`,
      data: data.lead_id ? { lead_id: data.lead_id } : undefined,
      urgency: "normal",
    }),

    appointment_reminder: (data: {
      name: string
      date: string
      time: string
      lead_id?: string
    }) => ({
      type: "appointment_reminder",
      title: `Termin in ${data.time}`,
      body: `${data.name} \u2013 ${data.date}`,
      data: data.lead_id ? { lead_id: data.lead_id } : undefined,
      urgency: "normal",
    }),

    performance_update: (data: { score: number; rank: number }) => ({
      type: "performance_update",
      title: "Tages-Update",
      body: `Score: ${data.score} | Platz ${data.rank}`,
      urgency: "low",
    }),
  }

/**
 * Build a PushNotification from a template type and data payload.
 */
export function buildNotification(
  type: NotificationType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): PushNotification {
  const factory = NOTIFICATION_TEMPLATES[type]
  return factory(data)
}
