// ---------------------------------------------------------------------------
// Lead Lifecycle State Machine
// ---------------------------------------------------------------------------

export type LeadState =
  | "neu"
  | "zugewiesen"
  | "kontaktversuch"
  | "nicht_erreicht"
  | "qualifiziert"
  | "termin"
  | "show"
  | "no_show"
  | "nachfassen"
  | "abschluss"
  | "verloren"
  | "warteschlange";

export interface Transition {
  from: LeadState;
  to: LeadState;
  trigger: "manual" | "auto" | "both";
  label: string;
  autoCondition?: string;
}

// ---------------------------------------------------------------------------
// Full transition map
// ---------------------------------------------------------------------------

export const TRANSITIONS: Transition[] = [
  // --- neu ---
  {
    from: "neu",
    to: "zugewiesen",
    trigger: "auto",
    label: "Berater zuweisen",
    autoCondition: "Berater wurde zugewiesen",
  },
  {
    from: "neu",
    to: "warteschlange",
    trigger: "auto",
    label: "In Warteschlange",
    autoCondition: "Kein Berater verfügbar",
  },

  // --- warteschlange ---
  {
    from: "warteschlange",
    to: "zugewiesen",
    trigger: "auto",
    label: "Berater zuweisen",
    autoCondition: "Berater wird verfügbar",
  },

  // --- zugewiesen ---
  {
    from: "zugewiesen",
    to: "kontaktversuch",
    trigger: "auto",
    label: "Kontakt hergestellt",
    autoCondition: "Anrufergebnis: erreicht",
  },
  {
    from: "zugewiesen",
    to: "nicht_erreicht",
    trigger: "auto",
    label: "Nicht erreicht",
    autoCondition: "Anrufergebnis: nicht erreicht",
  },
  {
    from: "zugewiesen",
    to: "verloren",
    trigger: "auto",
    label: "Verloren",
    autoCondition: "Anrufergebnis: ungültig oder kein Interesse",
  },
  {
    from: "zugewiesen",
    to: "termin",
    trigger: "auto",
    label: "Termin gebucht",
    autoCondition: "Anrufergebnis: Termin vereinbart",
  },
  {
    from: "zugewiesen",
    to: "nachfassen",
    trigger: "auto",
    label: "Nachfassen",
    autoCondition: "Anrufergebnis: Rückruf gewünscht",
  },

  // --- kontaktversuch ---
  {
    from: "kontaktversuch",
    to: "qualifiziert",
    trigger: "manual",
    label: "Qualifizieren",
  },
  {
    from: "kontaktversuch",
    to: "nicht_erreicht",
    trigger: "auto",
    label: "Nicht erreicht",
    autoCondition: "Folgeanruf nicht erreicht",
  },
  {
    from: "kontaktversuch",
    to: "nachfassen",
    trigger: "manual",
    label: "Nachfassen",
  },
  {
    from: "kontaktversuch",
    to: "verloren",
    trigger: "manual",
    label: "Verloren",
  },

  // --- nicht_erreicht ---
  {
    from: "nicht_erreicht",
    to: "kontaktversuch",
    trigger: "auto",
    label: "Erneuter Kontaktversuch",
    autoCondition: "Nächster Anrufversuch gestartet",
  },
  {
    from: "nicht_erreicht",
    to: "nachfassen",
    trigger: "both",
    label: "Nachfassen",
    autoCondition: "Nach 3 fehlgeschlagenen Versuchen",
  },
  {
    from: "nicht_erreicht",
    to: "verloren",
    trigger: "both",
    label: "Verloren",
    autoCondition: "Maximale Versuche erreicht",
  },

  // --- qualifiziert ---
  {
    from: "qualifiziert",
    to: "termin",
    trigger: "both",
    label: "Termin buchen",
    autoCondition: "Termin wurde gebucht",
  },
  {
    from: "qualifiziert",
    to: "nachfassen",
    trigger: "manual",
    label: "Nachfassen",
  },
  {
    from: "qualifiziert",
    to: "verloren",
    trigger: "manual",
    label: "Verloren",
  },

  // --- termin ---
  {
    from: "termin",
    to: "show",
    trigger: "manual",
    label: "Erschienen",
  },
  {
    from: "termin",
    to: "no_show",
    trigger: "both",
    label: "Nicht erschienen",
    autoCondition: "Termin verpasst",
  },

  // --- show ---
  {
    from: "show",
    to: "abschluss",
    trigger: "manual",
    label: "Abschluss",
  },
  {
    from: "show",
    to: "nachfassen",
    trigger: "manual",
    label: "Nachfassen",
  },

  // --- no_show ---
  {
    from: "no_show",
    to: "nachfassen",
    trigger: "manual",
    label: "Nachfassen",
  },
  {
    from: "no_show",
    to: "verloren",
    trigger: "manual",
    label: "Verloren",
  },

  // --- nachfassen ---
  {
    from: "nachfassen",
    to: "kontaktversuch",
    trigger: "auto",
    label: "Erneuter Kontaktversuch",
    autoCondition: "Nächster Kontaktversuch gestartet",
  },
  {
    from: "nachfassen",
    to: "termin",
    trigger: "manual",
    label: "Neuer Termin",
  },
  {
    from: "nachfassen",
    to: "verloren",
    trigger: "manual",
    label: "Verloren",
  },

  // --- verloren → neu (admin only, reactivate) ---
  {
    from: "verloren",
    to: "neu",
    trigger: "manual",
    label: "Reaktivieren",
  },
];

// ---------------------------------------------------------------------------
// Pre-computed lookup for fast transition checks
// ---------------------------------------------------------------------------

const transitionMap = new Map<string, Transition[]>();
for (const t of TRANSITIONS) {
  const key = t.from;
  const existing = transitionMap.get(key) ?? [];
  existing.push(t);
  transitionMap.set(key, existing);
}

// ---------------------------------------------------------------------------
// All states that can reach "verloren" (admin can always mark lost)
// ---------------------------------------------------------------------------

const ALL_STATES: LeadState[] = [
  "neu",
  "zugewiesen",
  "kontaktversuch",
  "nicht_erreicht",
  "qualifiziert",
  "termin",
  "show",
  "no_show",
  "nachfassen",
  "abschluss",
  "warteschlange",
];

// ---------------------------------------------------------------------------
// Role-based allowed targets per state
// ---------------------------------------------------------------------------

const BERATER_ALLOWED: Record<string, LeadState[]> = {
  zugewiesen: ["kontaktversuch", "nicht_erreicht", "nachfassen", "termin", "verloren"],
  kontaktversuch: ["qualifiziert", "nicht_erreicht", "nachfassen", "verloren"],
  nicht_erreicht: ["kontaktversuch", "nachfassen", "verloren"],
  qualifiziert: ["termin", "nachfassen", "verloren"],
  termin: ["show", "no_show"],
  show: ["abschluss", "nachfassen"],
  no_show: ["nachfassen", "verloren"],
  nachfassen: ["kontaktversuch", "termin", "verloren"],
};

const SETTER_ALLOWED: Record<string, LeadState[]> = {
  zugewiesen: ["kontaktversuch", "nicht_erreicht", "termin", "nachfassen"],
  kontaktversuch: ["qualifiziert", "nicht_erreicht", "termin"],
  nicht_erreicht: ["kontaktversuch", "nachfassen"],
  qualifiziert: ["termin"],
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Return the list of valid next states for a given current state and user role.
 * Admin can do everything a berater can plus "Any → verloren" and "verloren → neu".
 */
export function getValidTransitions(
  currentState: LeadState,
  role: "admin" | "berater" | "setter"
): { state: LeadState; label: string }[] {
  let allowed: LeadState[];

  if (role === "setter") {
    allowed = SETTER_ALLOWED[currentState] ?? [];
  } else {
    // berater + admin share the berater map
    allowed = BERATER_ALLOWED[currentState] ?? [];

    if (role === "admin") {
      // Admin: any state → verloren
      if (
        currentState !== "verloren" &&
        currentState !== "abschluss" &&
        !allowed.includes("verloren")
      ) {
        allowed = [...allowed, "verloren"];
      }
      // Admin: verloren → neu (reactivate)
      if (currentState === "verloren") {
        allowed = ["neu"];
      }
    }
  }

  // Look up labels from TRANSITIONS
  return allowed.map((to) => {
    const t = TRANSITIONS.find((tr) => tr.from === currentState && tr.to === to);
    return {
      state: to,
      label: t?.label ?? STATUS_CONFIG[to].label,
    };
  });
}

/**
 * Check whether a direct transition from → to exists in the state machine
 * (regardless of role).
 */
export function isValidTransition(from: LeadState, to: LeadState): boolean {
  // Explicit transition defined
  const found = TRANSITIONS.some((t) => t.from === from && t.to === to);
  if (found) return true;

  // "Any → verloren" (admin override)
  if (to === "verloren" && from !== "verloren" && from !== "abschluss") return true;

  // "verloren → neu" (admin reactivate)
  if (from === "verloren" && to === "neu") return true;

  return false;
}

/**
 * Given a current state and a system event, return the auto-transition target
 * or null if no auto-transition is defined for that event.
 */
export function getAutoTransition(
  from: LeadState,
  event: string
): LeadState | null {
  const mapping: Record<string, Record<string, LeadState>> = {
    neu: {
      berater_assigned: "zugewiesen",
      no_berater_available: "warteschlange",
    },
    warteschlange: {
      berater_available: "zugewiesen",
    },
    zugewiesen: {
      call_reached: "kontaktversuch",
      call_not_reached: "nicht_erreicht",
      call_invalid: "verloren",
      call_not_interested: "verloren",
      appointment_booked: "termin",
      callback_requested: "nachfassen",
    },
    kontaktversuch: {
      call_not_reached: "nicht_erreicht",
    },
    nicht_erreicht: {
      call_reached: "kontaktversuch",
      max_attempts_followup: "nachfassen",
      max_attempts_lost: "verloren",
    },
    qualifiziert: {
      appointment_booked: "termin",
    },
    termin: {
      appointment_missed: "no_show",
    },
    nachfassen: {
      call_reached: "kontaktversuch",
      call_not_reached: "kontaktversuch",
    },
  };

  return mapping[from]?.[event] ?? null;
}

// ---------------------------------------------------------------------------
// STATUS_CONFIG – visual metadata per state
// ---------------------------------------------------------------------------

export const STATUS_CONFIG: Record<
  LeadState,
  {
    label: string;
    color: string;
    icon: string;
    description: string;
    allowedActions: ("call" | "email" | "whatsapp" | "note" | "termin")[];
  }
> = {
  neu: {
    label: "Neu",
    color: "bg-blue-100 text-blue-800",
    icon: "Sparkles",
    description: "Gerade eingegangen, noch nicht zugewiesen",
    allowedActions: ["note"],
  },
  zugewiesen: {
    label: "Zugewiesen",
    color: "bg-indigo-100 text-indigo-800",
    icon: "UserCheck",
    description: "Einem Berater zugewiesen, wartet auf Bearbeitung",
    allowedActions: ["call", "email", "whatsapp", "note"],
  },
  kontaktversuch: {
    label: "Kontaktversuch",
    color: "bg-yellow-100 text-yellow-800",
    icon: "PhoneCall",
    description: "Kontakt wurde hergestellt",
    allowedActions: ["call", "email", "whatsapp", "note", "termin"],
  },
  nicht_erreicht: {
    label: "Nicht erreicht",
    color: "bg-amber-100 text-amber-800",
    icon: "PhoneMissed",
    description: "Kontaktversuch fehlgeschlagen",
    allowedActions: ["call", "email", "whatsapp", "note"],
  },
  qualifiziert: {
    label: "Qualifiziert",
    color: "bg-cyan-100 text-cyan-800",
    icon: "CheckCircle",
    description: "Lead ist qualifiziert und interessiert",
    allowedActions: ["call", "email", "whatsapp", "note", "termin"],
  },
  termin: {
    label: "Termin",
    color: "bg-purple-100 text-purple-800",
    icon: "CalendarCheck",
    description: "Termin wurde gebucht",
    allowedActions: ["call", "email", "whatsapp", "note"],
  },
  show: {
    label: "Show",
    color: "bg-emerald-100 text-emerald-800",
    icon: "UserCheck",
    description: "Zum Termin erschienen",
    allowedActions: ["note"],
  },
  no_show: {
    label: "No-Show",
    color: "bg-orange-100 text-orange-800",
    icon: "UserX",
    description: "Nicht zum Termin erschienen",
    allowedActions: ["call", "email", "whatsapp", "note"],
  },
  nachfassen: {
    label: "Nachfassen",
    color: "bg-teal-100 text-teal-800",
    icon: "RotateCcw",
    description: "Follow-up erforderlich",
    allowedActions: ["call", "email", "whatsapp", "note", "termin"],
  },
  abschluss: {
    label: "Abschluss",
    color: "bg-green-100 text-green-800",
    icon: "Trophy",
    description: "Deal abgeschlossen",
    allowedActions: ["note"],
  },
  verloren: {
    label: "Verloren",
    color: "bg-red-100 text-red-800",
    icon: "XCircle",
    description: "Lead verloren",
    allowedActions: ["note"],
  },
  warteschlange: {
    label: "Warteschlange",
    color: "bg-gray-100 text-gray-800",
    icon: "Clock",
    description: "In der Warteschlange, kein Berater verfügbar",
    allowedActions: ["note"],
  },
};

// Re-export ALL_STATES for convenience
export { ALL_STATES };
