import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type Lead = Database["public"]["Tables"]["leads"]["Row"]

interface DuplicatePair {
  leadA: Lead
  leadB: Lead
  matchType: string
  confidence: string
}

export async function GET() {
  const supabase = await createClient()

  // --- Auth: verify admin role ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Nur Administratoren können Duplikate suchen." },
      { status: 403 }
    )
  }

  // --- Fetch recent leads (last 6 months, limit 2000 for performance) ---
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: leads, error: fetchErr } = await supabase
    .from("leads")
    .select("*")
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(2000)

  if (fetchErr || !leads) {
    return NextResponse.json(
      { error: "Fehler beim Laden der Leads" },
      { status: 500 }
    )
  }

  const duplicates: DuplicatePair[] = []
  const seenPairs = new Set<string>()

  function addPair(a: Lead, b: Lead, matchType: string, confidence: string) {
    // Ensure we don't add both (a,b) and (b,a)
    const key = [a.id, b.id].sort().join(":")
    if (seenPairs.has(key)) return
    seenPairs.add(key)
    duplicates.push({ leadA: a, leadB: b, matchType, confidence })
  }

  // --- Group by email ---
  const byEmail = new Map<string, Lead[]>()
  for (const lead of leads) {
    const email = lead.email?.trim().toLowerCase()
    if (!email) continue
    const group = byEmail.get(email) ?? []
    group.push(lead)
    byEmail.set(email, group)
  }

  for (const [, group] of Array.from(byEmail)) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        addPair(group[i], group[j], "E-Mail", "hoch")
        if (duplicates.length >= 50) break
      }
      if (duplicates.length >= 50) break
    }
    if (duplicates.length >= 50) break
  }

  // --- Group by phone ---
  if (duplicates.length < 50) {
    const byPhone = new Map<string, Lead[]>()
    for (const lead of leads) {
      const telefon = lead.telefon?.trim().replace(/\s+/g, "")
      if (!telefon || telefon.length < 6) continue
      const group = byPhone.get(telefon) ?? []
      group.push(lead)
      byPhone.set(telefon, group)
    }

    for (const [, group] of Array.from(byPhone)) {
      if (group.length < 2) continue
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addPair(group[i], group[j], "Telefon", "hoch")
          if (duplicates.length >= 50) break
        }
        if (duplicates.length >= 50) break
      }
      if (duplicates.length >= 50) break
    }
  }

  // --- Check name similarity + phone prefix ---
  if (duplicates.length < 50) {
    const byName = new Map<string, Lead[]>()
    for (const lead of leads) {
      const vorname = lead.vorname?.trim().toLowerCase()
      const nachname = lead.nachname?.trim().toLowerCase()
      if (!vorname || !nachname) continue
      const key = `${vorname}:${nachname}`
      const group = byName.get(key) ?? []
      group.push(lead)
      byName.set(key, group)
    }

    for (const [, group] of Array.from(byName)) {
      if (group.length < 2) continue
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          // Same name is medium confidence even without phone
          addPair(group[i], group[j], "Name", "mittel")
          if (duplicates.length >= 50) break
        }
        if (duplicates.length >= 50) break
      }
      if (duplicates.length >= 50) break
    }
  }

  return NextResponse.json({
    duplicates,
    total: duplicates.length,
  })
}
