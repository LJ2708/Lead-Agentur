import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DuplicateResult {
  isDuplicate: boolean
  matchedLeadId?: string
  matchType?: "email" | "phone" | "email+phone" | "name+phone"
  confidence: "high" | "medium" | "low"
}

interface LeadInput {
  email?: string
  telefon?: string
  vorname?: string
  nachname?: string
}

// ---------------------------------------------------------------------------
// Check for duplicates within the last 90 days
// ---------------------------------------------------------------------------

export async function checkDuplicate(lead: LeadInput): Promise<DuplicateResult> {
  const supabase = createClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const cutoff = ninetyDaysAgo.toISOString()

  const email = lead.email?.trim().toLowerCase() || ""
  const telefon = lead.telefon?.trim() || ""
  const vorname = lead.vorname?.trim().toLowerCase() || ""
  const nachname = lead.nachname?.trim().toLowerCase() || ""

  // Early exit if nothing to check
  if (!email && !telefon) {
    return { isDuplicate: false, confidence: "low" }
  }

  // Build OR conditions for a single query
  const orConditions: string[] = []
  if (email) {
    orConditions.push(`email.ilike.${email}`)
  }
  if (telefon) {
    orConditions.push(`telefon.eq.${telefon}`)
  }

  if (orConditions.length === 0) {
    return { isDuplicate: false, confidence: "low" }
  }

  const { data: matches } = await supabase
    .from("leads")
    .select("id, email, telefon, vorname, nachname")
    .gte("created_at", cutoff)
    .or(orConditions.join(","))
    .limit(10)

  if (!matches || matches.length === 0) {
    return { isDuplicate: false, confidence: "low" }
  }

  // Check matches in priority order
  for (const match of matches) {
    const matchEmail = (match.email ?? "").toLowerCase()
    const matchTelefon = match.telefon ?? ""
    const matchVorname = (match.vorname ?? "").toLowerCase()
    const matchNachname = (match.nachname ?? "").toLowerCase()

    const emailMatches = email && matchEmail === email
    const phoneMatches = telefon && matchTelefon === telefon

    // Email + phone both match = high confidence
    if (emailMatches && phoneMatches) {
      return {
        isDuplicate: true,
        matchedLeadId: match.id,
        matchType: "email+phone",
        confidence: "high",
      }
    }

    // Exact email match = high confidence
    if (emailMatches) {
      return {
        isDuplicate: true,
        matchedLeadId: match.id,
        matchType: "email",
        confidence: "high",
      }
    }

    // Exact phone match = high confidence
    if (phoneMatches) {
      // Also check if name matches for even stronger signal
      const nameMatches =
        vorname && nachname && matchVorname === vorname && matchNachname === nachname

      if (nameMatches) {
        return {
          isDuplicate: true,
          matchedLeadId: match.id,
          matchType: "name+phone",
          confidence: "high",
        }
      }

      return {
        isDuplicate: true,
        matchedLeadId: match.id,
        matchType: "phone",
        confidence: "high",
      }
    }
  }

  // Name + phone match (already checked above within phone matches,
  // but handle the edge case where only name is provided with phone)
  if (vorname && nachname && telefon) {
    for (const match of matches) {
      const matchVorname = (match.vorname ?? "").toLowerCase()
      const matchNachname = (match.nachname ?? "").toLowerCase()
      const matchTelefon = match.telefon ?? ""

      if (
        matchVorname === vorname &&
        matchNachname === nachname &&
        matchTelefon === telefon
      ) {
        return {
          isDuplicate: true,
          matchedLeadId: match.id,
          matchType: "name+phone",
          confidence: "medium",
        }
      }
    }
  }

  return { isDuplicate: false, confidence: "low" }
}
