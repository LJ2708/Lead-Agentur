import { NextRequest, NextResponse } from "next/server"
import { verifyCronAuth } from "@/lib/cron/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/client"
import { emailLayout } from "@/lib/email/templates"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hub.leadsolution.de"

interface BeraterSummary {
  beraterId: string
  profileId: string
  name: string
  email: string
  received: number
  contacted: number
  appointments: number
  closed: number
  score: number
}

function weekRange(): { start: string; end: string; prevStart: string; prevEnd: string } {
  const now = new Date()
  // Last Monday at 00:00
  const day = now.getDay()
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - ((day + 6) % 7) - 7)
  lastMonday.setHours(0, 0, 0, 0)

  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 7)
  lastSunday.setHours(0, 0, 0, 0)

  const prevMonday = new Date(lastMonday)
  prevMonday.setDate(lastMonday.getDate() - 7)

  return {
    start: lastMonday.toISOString(),
    end: lastSunday.toISOString(),
    prevStart: prevMonday.toISOString(),
    prevEnd: lastMonday.toISOString(),
  }
}

function compareArrow(current: number, previous: number): string {
  if (current > previous) return `&#9650; +${current - previous}`
  if (current < previous) return `&#9660; ${current - previous}`
  return "&#8596; 0"
}

function buildBeraterEmailHtml(summary: BeraterSummary, rank: number, total: number, prevSummary: Partial<BeraterSummary>): string {
  return emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">Wochenbericht</h2>
    <p>Hallo ${summary.name},</p>
    <p>Hier ist deine Zusammenfassung der letzten Woche:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f4f4f5;">Leads erhalten</td>
        <td style="padding: 10px 14px; background-color: #f4f4f5;">${summary.received} (${compareArrow(summary.received, prevSummary.received ?? 0)})</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600;">Kontaktiert</td>
        <td style="padding: 10px 14px;">${summary.contacted} (${compareArrow(summary.contacted, prevSummary.contacted ?? 0)})</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f4f4f5;">Termine</td>
        <td style="padding: 10px 14px; background-color: #f4f4f5;">${summary.appointments} (${compareArrow(summary.appointments, prevSummary.appointments ?? 0)})</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600;">Abschl&uuml;sse</td>
        <td style="padding: 10px 14px;">${summary.closed} (${compareArrow(summary.closed, prevSummary.closed ?? 0)})</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f4f4f5;">Score</td>
        <td style="padding: 10px 14px; background-color: #f4f4f5;">${summary.score}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600;">Rang</td>
        <td style="padding: 10px 14px;">${rank} von ${total}</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="border-radius: 6px; background-color: #2563EB;">
          <a href="${APP_URL}/berater" target="_blank"
             style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #2563EB;">
            Dashboard &ouml;ffnen
          </a>
        </td>
      </tr>
    </table>
  `)
}

function buildAdminEmailHtml(summaries: BeraterSummary[]): string {
  const totalReceived = summaries.reduce((s, b) => s + b.received, 0)
  const totalContacted = summaries.reduce((s, b) => s + b.contacted, 0)
  const totalAppointments = summaries.reduce((s, b) => s + b.appointments, 0)
  const totalClosed = summaries.reduce((s, b) => s + b.closed, 0)

  const beraterRows = summaries
    .sort((a, b) => b.score - a.score)
    .map(
      (b, i) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${i + 1}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${b.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${b.received}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${b.contacted}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${b.appointments}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${b.closed}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-weight: 600;">${b.score}</td>
        </tr>`
    )
    .join("")

  return emailLayout(`
    <h2 style="margin: 0 0 16px 0; font-size: 20px;">Team-Wochenbericht</h2>
    <p>Hier ist die Team-&Uuml;bersicht der letzten Woche:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f4f4f5;">Leads erhalten (gesamt)</td>
        <td style="padding: 10px 14px; background-color: #f4f4f5;">${totalReceived}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600;">Kontaktiert (gesamt)</td>
        <td style="padding: 10px 14px;">${totalContacted}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f4f4f5;">Termine (gesamt)</td>
        <td style="padding: 10px 14px; background-color: #f4f4f5;">${totalAppointments}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 600;">Abschl&uuml;sse (gesamt)</td>
        <td style="padding: 10px 14px;">${totalClosed}</td>
      </tr>
    </table>

    <h3 style="margin: 24px 0 12px 0; font-size: 16px;">Berater-Ranking</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; font-size: 13px;">
      <tr style="background-color: #f4f4f5;">
        <th style="padding: 8px 12px; text-align: left;">#</th>
        <th style="padding: 8px 12px; text-align: left;">Name</th>
        <th style="padding: 8px 12px; text-align: left;">Erhalten</th>
        <th style="padding: 8px 12px; text-align: left;">Kontaktiert</th>
        <th style="padding: 8px 12px; text-align: left;">Termine</th>
        <th style="padding: 8px 12px; text-align: left;">Abschl&uuml;sse</th>
        <th style="padding: 8px 12px; text-align: left;">Score</th>
      </tr>
      ${beraterRows}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="border-radius: 6px; background-color: #2563EB;">
          <a href="${APP_URL}/admin" target="_blank"
             style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #2563EB;">
            Admin-Dashboard &ouml;ffnen
          </a>
        </td>
      </tr>
    </table>
  `)
}

async function computeSummaries(
  supabase: ReturnType<typeof createAdminClient>,
  startDate: string,
  endDate: string
): Promise<BeraterSummary[]> {
  // Get all active berater with profiles
  const { data: beraterList } = await supabase
    .from("berater")
    .select("id, profile_id, profiles:profile_id(full_name, email)")
    .eq("status", "aktiv")

  if (!beraterList || beraterList.length === 0) return []

  const summaries: BeraterSummary[] = []

  for (const b of beraterList) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (b as any).profiles as { full_name: string; email: string } | null
    if (!profile) continue

    // Leads received this week
    const { count: received } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("berater_id", b.id)
      .gte("zugewiesen_am", startDate)
      .lt("zugewiesen_am", endDate)

    // Contacted (has kontaktversuch or erster_kontakt_am in range)
    const { count: contacted } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("berater_id", b.id)
      .gte("erster_kontakt_am", startDate)
      .lt("erster_kontakt_am", endDate)

    // Appointments
    const { count: appointments } = await supabase
      .from("termine")
      .select("*", { count: "exact", head: true })
      .eq("berater_id", b.id)
      .gte("created_at", startDate)
      .lt("created_at", endDate)

    // Closed
    const { count: closed } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("berater_id", b.id)
      .eq("status", "abschluss")
      .gte("abschluss_am", startDate)
      .lt("abschluss_am", endDate)

    const r = received ?? 0
    const cont = contacted ?? 0
    const apt = appointments ?? 0
    const cl = closed ?? 0

    // Simple score: weighted sum
    const score = r * 1 + cont * 2 + apt * 5 + cl * 10

    summaries.push({
      beraterId: b.id,
      profileId: b.profile_id,
      name: profile.full_name,
      email: profile.email,
      received: r,
      contacted: cont,
      appointments: apt,
      closed: cl,
      score,
    })
  }

  return summaries
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { start, end, prevStart, prevEnd } = weekRange()

    // Compute current and previous week summaries
    const currentSummaries = await computeSummaries(supabase, start, end)
    const prevSummaries = await computeSummaries(supabase, prevStart, prevEnd)

    // Create lookup for previous week
    const prevMap = new Map<string, BeraterSummary>()
    for (const ps of prevSummaries) {
      prevMap.set(ps.beraterId, ps)
    }

    // Rank by score
    const ranked = [...currentSummaries].sort((a, b) => b.score - a.score)

    // Send individual berater emails
    let sentCount = 0
    for (let i = 0; i < ranked.length; i++) {
      const summary = ranked[i]
      const prev = prevMap.get(summary.beraterId) ?? {}
      const html = buildBeraterEmailHtml(summary, i + 1, ranked.length, prev)
      const sent = await sendEmail(summary.email, "Dein Wochenbericht - LeadSolution", html)
      if (sent) sentCount++
    }

    // Send admin overview
    const { data: admins } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "admin")

    if (admins) {
      const adminHtml = buildAdminEmailHtml(currentSummaries)
      for (const admin of admins) {
        await sendEmail(admin.email, "Team-Wochenbericht - LeadSolution", adminHtml)
      }
    }

    return NextResponse.json({
      ok: true,
      beraterEmails: sentCount,
      adminEmails: admins?.length ?? 0,
      period: { start, end },
    })
  } catch (error) {
    console.error("[weekly-report] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
