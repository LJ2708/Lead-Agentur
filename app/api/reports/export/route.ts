import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToDate(period: string): string {
  const d = new Date()
  switch (period) {
    case "7d":
      d.setDate(d.getDate() - 7)
      break
    case "90d":
      d.setDate(d.getDate() - 90)
      break
    case "30d":
    default:
      d.setDate(d.getDate() - 30)
      break
  }
  return d.toISOString()
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(",")
}

// ---------------------------------------------------------------------------
// GET /api/reports/export?period=30d&format=csv
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check — admin only
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "admin" && profile.role !== "teamleiter")) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") ?? "30d"
  const since = periodToDate(period)

  // ------- Fetch data -------

  // Leads
  const { data: leads } = await supabase
    .from("leads")
    .select("id, vorname, nachname, status, source, berater_id, sla_status, created_at")
    .gte("created_at", since)

  const allLeads = leads ?? []
  const totalLeads = allLeads.length
  const closedLeads = allLeads.filter((l) => l.status === "abschluss").length
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0"
  const slaOkCount = allLeads.filter(
    (l) => l.sla_status === "met" || l.sla_status === "active"
  ).length
  const slaRate = totalLeads > 0 ? ((slaOkCount / totalLeads) * 100).toFixed(1) : "0.0"

  // Revenue
  const { data: zahlungen } = await supabase
    .from("zahlungen")
    .select("betrag_cents")
    .gte("created_at", since)

  const totalRevenueCents = (zahlungen ?? []).reduce((a, z) => a + z.betrag_cents, 0)
  const totalRevenueEur = (totalRevenueCents / 100).toFixed(2).replace(".", ",")

  // Berater data
  const { data: beraterList } = await supabase
    .from("berater")
    .select(
      "id, leads_kontingent, leads_geliefert, umsatz_gesamt_cents, profiles:profile_id(full_name)"
    )
    .eq("status", "aktiv")

  const beraterRows: {
    name: string
    leadsReceived: number
    contacted: number
    termine: number
    closed: number
    revenue: string
    slaRate: string
    score: number
  }[] = []

  for (const b of beraterList ?? []) {
    const prof = b.profiles as unknown as { full_name: string | null } | null
    const name = prof?.full_name ?? "Unbekannt"

    const beraterLeads = allLeads.filter((l) => l.berater_id === b.id)
    const leadsReceived = beraterLeads.length
    const contacted = beraterLeads.filter(
      (l) =>
        l.status !== "neu" &&
        l.status !== "zugewiesen" &&
        l.status !== "warteschlange"
    ).length
    const termine = beraterLeads.filter(
      (l) => l.status === "termin" || l.status === "show" || l.status === "no_show"
    ).length
    const closed = beraterLeads.filter((l) => l.status === "abschluss").length
    const revenue = ((b.umsatz_gesamt_cents ?? 0) / 100).toFixed(2).replace(".", ",")
    const beraterSlaOk = beraterLeads.filter(
      (l) => l.sla_status === "met" || l.sla_status === "active"
    ).length
    const beraterSlaRate =
      leadsReceived > 0
        ? ((beraterSlaOk / leadsReceived) * 100).toFixed(1)
        : "0.0"

    // Simple score: weighted combination
    const scoreBase =
      contacted * 10 + termine * 20 + closed * 30
    const score = Math.min(100, leadsReceived > 0 ? Math.round((scoreBase / leadsReceived) * 3.3) : 0)

    beraterRows.push({
      name,
      leadsReceived,
      contacted,
      termine,
      closed,
      revenue,
      slaRate: beraterSlaRate,
      score,
    })
  }

  // Per source
  const sourceMap: Record<string, { count: number; closed: number }> = {}
  for (const lead of allLeads) {
    const src = lead.source ?? "unbekannt"
    if (!sourceMap[src]) sourceMap[src] = { count: 0, closed: 0 }
    sourceMap[src].count += 1
    if (lead.status === "abschluss") sourceMap[src].closed += 1
  }

  // ------- Build CSV -------

  const lines: string[] = []

  // Summary section
  lines.push("ZUSAMMENFASSUNG")
  lines.push(csvRow(["Kennzahl", "Wert"]))
  lines.push(csvRow(["Leads gesamt", totalLeads]))
  lines.push(csvRow(["Conversion Rate", `${conversionRate}%`]))
  lines.push(csvRow(["Umsatz", `${totalRevenueEur} EUR`]))
  lines.push(csvRow(["SLA-Rate", `${slaRate}%`]))
  lines.push("")

  // Per berater section
  lines.push("PRO BERATER")
  lines.push(
    csvRow([
      "Name",
      "Leads erhalten",
      "Kontaktiert",
      "Termine",
      "Abschlüsse",
      "Umsatz (EUR)",
      "SLA-Rate",
      "Score",
    ])
  )
  for (const row of beraterRows) {
    lines.push(
      csvRow([
        row.name,
        row.leadsReceived,
        row.contacted,
        row.termine,
        row.closed,
        row.revenue,
        `${row.slaRate}%`,
        row.score,
      ])
    )
  }
  lines.push("")

  // Per source section
  lines.push("PRO QUELLE")
  lines.push(csvRow(["Quelle", "Leads", "Conversion Rate"]))
  for (const [source, data] of Object.entries(sourceMap)) {
    const srcConversion =
      data.count > 0 ? ((data.closed / data.count) * 100).toFixed(1) : "0.0"
    lines.push(csvRow([source, data.count, `${srcConversion}%`]))
  }

  const csv = lines.join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${period}.csv"`,
    },
  })
}
