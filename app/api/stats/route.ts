import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// GET /api/stats — Dashboard stats (role-based)
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient()

  // --- Auth ---------------------------------------------------------------
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

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 })
  }

  // --- Admin / Teamleiter stats ------------------------------------------
  if (profile.role === "admin" || profile.role === "teamleiter") {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      totalLeadsRes,
      leadsThisMonthRes,
      activeBeraterRes,
      totalRevenueRes,
      slaActiveRes,
      slaBreachedRes,
      abschlussRes,
      totalWithStatusRes,
    ] = await Promise.all([
      // Total leads
      supabase.from("leads").select("*", { count: "exact", head: true }),
      // Leads this month
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      // Active berater
      supabase
        .from("berater")
        .select("*", { count: "exact", head: true })
        .eq("status", "aktiv"),
      // Total revenue
      supabase.from("zahlungen").select("betrag_cents"),
      // SLA active (leads with sla_status = active)
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("sla_status", "active"),
      // SLA breached
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("sla_status", "breached"),
      // Abschluss count
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "abschluss"),
      // Total leads with any status (for conversion denominator)
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .not("status", "eq", "neu"),
    ])

    const totalLeads = totalLeadsRes.count ?? 0
    const leadsThisMonth = leadsThisMonthRes.count ?? 0
    const activeBerater = activeBeraterRes.count ?? 0

    const totalRevenueCents = (totalRevenueRes.data ?? []).reduce(
      (sum, z) => sum + (z.betrag_cents ?? 0),
      0
    )

    const slaActive = slaActiveRes.count ?? 0
    const slaBreached = slaBreachedRes.count ?? 0
    const slaTotal = slaActive + slaBreached
    const slaRate = slaTotal > 0 ? Math.round((slaActive / slaTotal) * 100) : 100

    const abschlussCount = abschlussRes.count ?? 0
    const totalProcessed = totalWithStatusRes.count ?? 0
    const conversionRate =
      totalProcessed > 0 ? Math.round((abschlussCount / totalProcessed) * 100) : 0

    return NextResponse.json({
      role: profile.role,
      totalLeads,
      leadsThisMonth,
      activeBerater,
      totalRevenueCents,
      slaRate,
      conversionRate,
    })
  }

  // --- Berater stats -----------------------------------------------------
  if (profile.role === "berater") {
    const { data: berater } = await supabase
      .from("berater")
      .select("id, leads_kontingent, leads_geliefert")
      .eq("profile_id", user.id)
      .single()

    if (!berater) {
      return NextResponse.json({ error: "Berater not found" }, { status: 404 })
    }

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const [openLeadsRes, termineRes, slaActiveRes] = await Promise.all([
      // Open leads (not abschluss or verloren)
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("berater_id", berater.id)
        .not("status", "in", '("abschluss","verloren")'),
      // Termine this week
      supabase
        .from("termine")
        .select("*", { count: "exact", head: true })
        .eq("berater_id", berater.id)
        .gte("datum", weekStart.toISOString())
        .lt("datum", weekEnd.toISOString()),
      // SLA active for this berater's leads
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("berater_id", berater.id)
        .eq("sla_status", "active"),
    ])

    return NextResponse.json({
      role: "berater",
      openLeads: openLeadsRes.count ?? 0,
      kontingent: berater.leads_kontingent,
      geliefert: berater.leads_geliefert,
      termineThisWeek: termineRes.count ?? 0,
      slaActiveCount: slaActiveRes.count ?? 0,
    })
  }

  // --- Setter (minimal stats) -------------------------------------------
  return NextResponse.json({ role: profile.role })
}
