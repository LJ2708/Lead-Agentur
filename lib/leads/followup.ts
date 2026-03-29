import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

type LeadStatus = Database["public"]["Enums"]["lead_status"]

export interface FollowUpRule {
  id: string
  name: string
  trigger_status: LeadStatus
  delay_hours: number
  action: "retry" | "email" | "reminder" | "auto-verloren"
  active: boolean
}

export const DEFAULT_FOLLOWUP_RULES: FollowUpRule[] = [
  {
    id: "rule_1",
    name: "Nicht erreicht: Erneut anrufen",
    trigger_status: "nicht_erreicht",
    delay_hours: 2,
    action: "retry",
    active: true,
  },
  {
    id: "rule_2",
    name: "Nicht erreicht: E-Mail senden",
    trigger_status: "nicht_erreicht",
    delay_hours: 24,
    action: "email",
    active: true,
  },
  {
    id: "rule_3",
    name: "Qualifiziert: Erinnerung",
    trigger_status: "qualifiziert",
    delay_hours: 48,
    action: "reminder",
    active: true,
  },
  {
    id: "rule_4",
    name: "No-Show: E-Mail senden",
    trigger_status: "no_show",
    delay_hours: 1,
    action: "email",
    active: true,
  },
  {
    id: "rule_5",
    name: "Nachfassen: Auto-Verloren",
    trigger_status: "nachfassen",
    delay_hours: 336,
    action: "auto-verloren",
    active: true,
  },
]

export interface FollowUpStats {
  processed: number
  actions_taken: number
  errors: number
  details: { lead_id: string; rule: string; action: string }[]
}

export async function processFollowUps(): Promise<FollowUpStats> {
  const supabase = createAdminClient()
  const stats: FollowUpStats = {
    processed: 0,
    actions_taken: 0,
    errors: 0,
    details: [],
  }

  // Load rules from routing_config, fallback to defaults
  let rules: FollowUpRule[] = DEFAULT_FOLLOWUP_RULES
  const { data: configRow } = await supabase
    .from("routing_config")
    .select("value")
    .eq("key", "followup_rules")
    .maybeSingle()

  if (configRow?.value) {
    try {
      const parsed = configRow.value as unknown as FollowUpRule[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        rules = parsed
      }
    } catch {
      // use defaults
    }
  }

  const activeRules = rules.filter((r) => r.active)
  const now = new Date()

  for (const rule of activeRules) {
    const cutoff = new Date(
      now.getTime() - rule.delay_hours * 60 * 60 * 1000
    ).toISOString()

    // Find leads matching this rule's trigger status that have been in that
    // status since before the cutoff time
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, vorname, nachname, status, updated_at, berater_id")
      .eq("status", rule.trigger_status)
      .lte("updated_at", cutoff)
      .not("berater_id", "is", null)

    if (error) {
      console.error(
        `[followup] Error fetching leads for rule ${rule.name}:`,
        error.message
      )
      stats.errors++
      continue
    }

    for (const lead of leads ?? []) {
      stats.processed++

      // Check if this rule already fired for this lead (avoid duplicates)
      const { data: existing } = await supabase
        .from("lead_activities")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("type", "system")
        .ilike("title", `%${rule.id}%`)
        .gte("created_at", cutoff)
        .limit(1)
        .maybeSingle()

      if (existing) continue

      try {
        switch (rule.action) {
          case "retry": {
            await supabase.from("lead_activities").insert({
              lead_id: lead.id,
              type: "system",
              title: `Follow-Up [${rule.id}]: Erneuter Kontaktversuch`,
              description: `Automatisch: ${rule.name} - Erneuter Anrufversuch geplant`,
            })
            await supabase
              .from("leads")
              .update({
                naechste_erinnerung: new Date().toISOString(),
              })
              .eq("id", lead.id)
            break
          }
          case "email": {
            await supabase.from("lead_activities").insert({
              lead_id: lead.id,
              type: "system",
              title: `Follow-Up [${rule.id}]: E-Mail geplant`,
              description: `Automatisch: ${rule.name} - Follow-Up E-Mail wird gesendet`,
            })
            break
          }
          case "reminder": {
            await supabase.from("lead_activities").insert({
              lead_id: lead.id,
              type: "system",
              title: `Follow-Up [${rule.id}]: Erinnerung`,
              description: `Automatisch: ${rule.name} - Berater wird erinnert`,
            })
            await supabase
              .from("leads")
              .update({
                naechste_erinnerung: new Date().toISOString(),
              })
              .eq("id", lead.id)
            break
          }
          case "auto-verloren": {
            await supabase
              .from("leads")
              .update({ status: "verloren" })
              .eq("id", lead.id)
            await supabase.from("lead_activities").insert({
              lead_id: lead.id,
              type: "status_change",
              title: `Follow-Up [${rule.id}]: Auto-Verloren`,
              description: `Automatisch: ${rule.name} - Lead als verloren markiert`,
              old_value: rule.trigger_status,
              new_value: "verloren",
            })
            break
          }
        }

        stats.actions_taken++
        stats.details.push({
          lead_id: lead.id,
          rule: rule.name,
          action: rule.action,
        })
      } catch (err) {
        console.error(
          `[followup] Error processing lead ${lead.id} for rule ${rule.name}:`,
          err
        )
        stats.errors++
      }
    }
  }

  return stats
}
