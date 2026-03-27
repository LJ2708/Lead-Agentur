import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { STATUS_CONFIG, type LeadState } from "./state-machine";

type ActivityType = Database["public"]["Enums"]["activity_type"];

// ---------------------------------------------------------------------------
// Core activity logger
// ---------------------------------------------------------------------------

interface LogActivityParams {
  leadId: string;
  type: ActivityType;
  title: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  createdBy?: string;
}

/**
 * Log a single activity record using the admin (service-role) client.
 * This bypasses RLS so it works from server actions, API routes and webhooks.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("lead_activities").insert({
    lead_id: params.leadId,
    type: params.type,
    title: params.title,
    description: params.description ?? null,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    created_by: params.createdBy ?? null,
  });

  if (error) {
    console.error("[auto-logger] Fehler beim Speichern der Aktivität:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Auto-log a status change with German labels.
 */
export async function logStatusChange(
  leadId: string,
  fromStatus: string,
  toStatus: string,
  userId?: string
): Promise<void> {
  const fromLabel =
    STATUS_CONFIG[fromStatus as LeadState]?.label ?? fromStatus;
  const toLabel =
    STATUS_CONFIG[toStatus as LeadState]?.label ?? toStatus;

  await logActivity({
    leadId,
    type: "status_change",
    title: `Status geändert: ${fromLabel} \u2192 ${toLabel}`,
    oldValue: fromStatus,
    newValue: toStatus,
    createdBy: userId,
  });
}

/**
 * Auto-log a contact attempt (call, email, whatsapp).
 */
export async function logContactAttempt(
  leadId: string,
  method: "call" | "email" | "whatsapp",
  outcome?: string,
  userId?: string
): Promise<void> {
  const methodLabels: Record<string, { type: ActivityType; label: string }> = {
    call: { type: "anruf", label: "Anruf" },
    email: { type: "email", label: "E-Mail" },
    whatsapp: { type: "whatsapp", label: "WhatsApp" },
  };

  const { type, label } = methodLabels[method];
  const title = outcome ? `${label} \u2013 ${outcome}` : label;

  await logActivity({
    leadId,
    type,
    title,
    description: outcome ?? undefined,
    createdBy: userId,
  });
}

/**
 * Auto-log an SLA event (started, met, breached).
 */
export async function logSlaEvent(
  leadId: string,
  event: "started" | "met" | "breached"
): Promise<void> {
  const labels: Record<string, string> = {
    started: "SLA-Timer gestartet",
    met: "SLA eingehalten",
    breached: "SLA überschritten",
  };

  await logActivity({
    leadId,
    type: "system",
    title: labels[event],
    description:
      event === "breached"
        ? "Die vereinbarte Reaktionszeit wurde überschritten."
        : undefined,
  });
}
