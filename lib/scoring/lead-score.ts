import type { Tables, Database } from "@/types/database";

type Lead = Tables<"leads">;
type Activity = Tables<"lead_activities">;
type LeadStatus = Database["public"]["Enums"]["lead_status"];
type LeadSource = Database["public"]["Enums"]["lead_source"];

export interface LeadScore {
  total: number; // 0-100
  breakdown: {
    dataQuality: number; // 0-25
    urgency: number; // 0-25
    engagement: number; // 0-25
    sourceQuality: number; // 0-25
  };
  priority: "hot" | "warm" | "cold";
  nextAction: string;
  nextActionType: "call" | "email" | "whatsapp" | "status_change" | "wait";
  reasoning: string;
}

const SOURCE_SCORES: Record<LeadSource, number> = {
  meta_lead_ad: 25,
  landingpage: 20,
  manuell: 15,
  import: 10,
};

const STATUS_PROGRESSION_ORDER: Record<string, number> = {
  neu: 0,
  zugewiesen: 1,
  kontaktversuch: 2,
  nicht_erreicht: 2,
  qualifiziert: 3,
  termin: 4,
  show: 5,
  no_show: 4,
  nachfassen: 3,
  abschluss: 6,
  verloren: -1,
  warteschlange: 0,
};

function calculateDataQuality(lead: Lead): number {
  let score = 0;
  if (lead.email) score += 5;
  if (lead.telefon) score += 5;
  if (lead.vorname && lead.nachname) score += 5;
  if (lead.opt_in_email) score += 5;
  if (lead.opt_in_whatsapp) score += 5;
  return score;
}

function calculateUrgency(lead: Lead): number {
  const now = new Date();
  let score = 0;

  // Recently assigned and no contact yet = urgent
  if (lead.zugewiesen_am) {
    const assignedAt = new Date(lead.zugewiesen_am);
    const hoursSinceAssignment =
      (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60);

    if (
      ["neu", "zugewiesen"].includes(lead.status) &&
      lead.kontaktversuche === 0
    ) {
      // Fresh lead, no contact yet
      if (hoursSinceAssignment < 1) {
        score += 25; // Brand new, act now
      } else if (hoursSinceAssignment < 2) {
        score += 22;
      } else if (hoursSinceAssignment < 4) {
        score += 18; // Getting stale
      } else if (hoursSinceAssignment < 24) {
        score += 12;
      } else {
        score += 5; // Old uncontacted lead
      }
    } else if (lead.status === "kontaktversuch" || lead.status === "nicht_erreicht") {
      // In progress, moderate urgency
      if (hoursSinceAssignment < 24) {
        score += 15;
      } else {
        score += 10;
      }
    } else if (lead.status === "qualifiziert") {
      score += 20; // Qualified leads are urgent
    } else if (lead.status === "termin") {
      // Check if appointment is soon
      if (lead.termin_am) {
        const terminDate = new Date(lead.termin_am);
        const hoursUntilTermin =
          (terminDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilTermin > 0 && hoursUntilTermin < 24) {
          score += 22; // Appointment tomorrow
        } else if (hoursUntilTermin > 0 && hoursUntilTermin < 48) {
          score += 15;
        } else {
          score += 10;
        }
      } else {
        score += 12;
      }
    } else if (lead.status === "no_show") {
      score += 18; // Need to reschedule
    } else if (lead.status === "nachfassen") {
      score += 14;
    } else if (lead.status === "show") {
      score += 16; // Follow up on the meeting
    } else {
      score += 5;
    }
  }

  // Penalize leads waiting >2h without any contact
  if (
    lead.zugewiesen_am &&
    lead.kontaktversuche === 0 &&
    ["neu", "zugewiesen"].includes(lead.status)
  ) {
    const hoursSince =
      (now.getTime() - new Date(lead.zugewiesen_am).getTime()) /
      (1000 * 60 * 60);
    if (hoursSince > 2) {
      // Already factored into urgency, but add a small penalty reasoning marker
      score = Math.min(score, 20);
    }
  }

  return Math.min(25, score);
}

function calculateEngagement(lead: Lead, activities: Activity[]): number {
  let score = 0;

  // Contact attempts (diminishing returns)
  const attempts = lead.kontaktversuche;
  if (attempts === 1) score += 5;
  else if (attempts === 2) score += 8;
  else if (attempts === 3) score += 10;
  else if (attempts > 3) score += 10; // Cap

  // Status progression
  const progression = STATUS_PROGRESSION_ORDER[lead.status] ?? 0;
  if (progression >= 4) score += 10; // termin or beyond
  else if (progression >= 3) score += 7; // qualifiziert
  else if (progression >= 2) score += 4; // kontaktversuch
  else score += 1;

  // Activity count as engagement indicator
  const activityCount = activities.length;
  if (activityCount >= 10) score += 5;
  else if (activityCount >= 5) score += 3;
  else if (activityCount >= 2) score += 2;

  return Math.min(25, score);
}

function calculateSourceQuality(lead: Lead): number {
  return SOURCE_SCORES[lead.source] ?? 10;
}

interface NextActionResult {
  nextAction: string;
  nextActionType: "call" | "email" | "whatsapp" | "status_change" | "wait";
  reasoning: string;
}

function determineNextAction(
  lead: Lead,
  _activities: Activity[] // eslint-disable-line @typescript-eslint/no-unused-vars
): NextActionResult {
  const status = lead.status as LeadStatus;
  const attempts = lead.kontaktversuche;

  switch (status) {
    case "neu":
    case "zugewiesen":
      return {
        nextAction: "Jetzt anrufen",
        nextActionType: "call",
        reasoning: `Neuer Lead seit ${lead.zugewiesen_am ? formatTimeAgo(lead.zugewiesen_am) : "kurzem"} \u2013 schnelle Kontaktaufnahme erh\u00f6ht die Abschlussquote.`,
      };

    case "kontaktversuch":
      if (attempts < 3) {
        return {
          nextAction: "Erneut anrufen",
          nextActionType: "call",
          reasoning: `Erst ${attempts} Kontaktversuch${attempts === 1 ? "" : "e"} \u2013 bis zu 3 Versuche empfohlen.`,
        };
      }
      return {
        nextAction: "WhatsApp senden",
        nextActionType: "whatsapp",
        reasoning: `Bereits ${attempts} Anrufversuche \u2013 alternativen Kanal nutzen.`,
      };

    case "nicht_erreicht":
      return {
        nextAction: "In 2 Stunden erneut versuchen",
        nextActionType: "wait",
        reasoning:
          "Lead war nicht erreichbar \u2013 sp\u00e4ter erneut versuchen f\u00fcr bessere Erreichbarkeit.",
      };

    case "qualifiziert":
      return {
        nextAction: "Termin vereinbaren",
        nextActionType: "call",
        reasoning:
          "Lead ist qualifiziert \u2013 jetzt einen Beratungstermin festlegen.",
      };

    case "termin":
      return {
        nextAction: "Termin best\u00e4tigen",
        nextActionType: "email",
        reasoning:
          "Termin steht \u2013 Best\u00e4tigung senden erh\u00f6ht die Show-Rate.",
      };

    case "show":
      return {
        nextAction: "Angebot nachfassen",
        nextActionType: "call",
        reasoning:
          "Gespr\u00e4ch hat stattgefunden \u2013 zeitnah nachfassen f\u00fcr Abschluss.",
      };

    case "no_show":
      return {
        nextAction: "Neuen Termin vorschlagen",
        nextActionType: "email",
        reasoning:
          "Termin wurde verpasst \u2013 neuen Termin per E-Mail vorschlagen.",
      };

    case "nachfassen":
      return {
        nextAction: "Follow-up senden",
        nextActionType: "email",
        reasoning:
          "Follow-up f\u00e4llig \u2013 per E-Mail nachhaken und Interesse pr\u00fcfen.",
      };

    case "abschluss":
      return {
        nextAction: "Abgeschlossen",
        nextActionType: "wait",
        reasoning: "Dieser Lead wurde erfolgreich abgeschlossen.",
      };

    case "verloren":
      return {
        nextAction: "Archiviert",
        nextActionType: "wait",
        reasoning: "Dieser Lead wurde als verloren markiert.",
      };

    case "warteschlange":
      return {
        nextAction: "Warten auf Zuweisung",
        nextActionType: "wait",
        reasoning: "Lead befindet sich in der Warteschlange.",
      };

    default:
      return {
        nextAction: "Status pr\u00fcfen",
        nextActionType: "status_change",
        reasoning: "Lead-Status \u00fcberpr\u00fcfen und n\u00e4chste Schritte festlegen.",
      };
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return "vor 1 Tag";
  return `vor ${diffDays} Tagen`;
}

export { formatTimeAgo };

export function calculateLeadScore(
  lead: Lead,
  activities: Activity[] = []
): LeadScore {
  const dataQuality = calculateDataQuality(lead);
  const urgency = calculateUrgency(lead);
  const engagement = calculateEngagement(lead, activities);
  const sourceQuality = calculateSourceQuality(lead);

  const total = dataQuality + urgency + engagement + sourceQuality;

  let priority: "hot" | "warm" | "cold";
  if (total >= 70) {
    priority = "hot";
  } else if (total >= 40) {
    priority = "warm";
  } else {
    priority = "cold";
  }

  const { nextAction, nextActionType, reasoning } = determineNextAction(
    lead,
    activities
  );

  return {
    total,
    breakdown: {
      dataQuality,
      urgency,
      engagement,
      sourceQuality,
    },
    priority,
    nextAction,
    nextActionType,
    reasoning,
  };
}
