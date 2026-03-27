import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SAMPLE_LEADS = [
  {
    vorname: "Maximilian",
    nachname: "Müller",
    email: "m.mueller@beispiel.de",
    telefon: "+49 170 1234001",
    source: "meta_lead_ad" as const,
    status: "neu" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: false,
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "sommer_aktion_2026",
  },
  {
    vorname: "Sophie",
    nachname: "Schmidt",
    email: "sophie.schmidt@web.de",
    telefon: "+49 151 2345678",
    source: "landingpage" as const,
    status: "zugewiesen" as const,
    opt_in_email: true,
    opt_in_whatsapp: false,
    opt_in_telefon: true,
    utm_source: "google",
    utm_medium: "organic",
  },
  {
    vorname: "Thomas",
    nachname: "Wagner",
    email: "t.wagner@gmx.de",
    telefon: "+49 176 9876543",
    source: "meta_lead_ad" as const,
    status: "kontaktversuch" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: true,
    kontaktversuche: 2,
    utm_source: "instagram",
    utm_medium: "cpc",
    utm_campaign: "herbst_leads",
  },
  {
    vorname: "Laura",
    nachname: "Fischer",
    email: "laura.fischer@outlook.de",
    telefon: "+49 162 3456789",
    source: "manuell" as const,
    status: "qualifiziert" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: false,
    custom_fields: { notizen: "Sehr interessiert an Premiumpaket" },
  },
  {
    vorname: "Alexander",
    nachname: "Becker",
    email: "alex.becker@t-online.de",
    telefon: "+49 173 5678901",
    source: "landingpage" as const,
    status: "termin" as const,
    opt_in_email: true,
    opt_in_whatsapp: false,
    opt_in_telefon: true,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "berater_suche",
  },
  {
    vorname: "Anna",
    nachname: "Hoffmann",
    email: "anna.hoffmann@yahoo.de",
    telefon: "+49 157 4567890",
    source: "meta_lead_ad" as const,
    status: "abschluss" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: true,
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "lead_magnet_q1",
  },
  {
    vorname: "Martin",
    nachname: "Schulz",
    email: "martin.schulz@freenet.de",
    telefon: "+49 178 6789012",
    source: "manuell" as const,
    status: "verloren" as const,
    opt_in_email: false,
    opt_in_whatsapp: false,
    opt_in_telefon: true,
    custom_fields: { notizen: "Budget zu gering, evtl. nächstes Quartal" },
  },
  {
    vorname: "Julia",
    nachname: "Weber",
    email: "j.weber@icloud.com",
    telefon: "+49 160 7890123",
    source: "landingpage" as const,
    status: "neu" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: false,
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "b2b_aktion",
  },
  {
    vorname: "Daniel",
    nachname: "Koch",
    email: "d.koch@beispiel.de",
    telefon: "+49 172 8901234",
    source: "meta_lead_ad" as const,
    status: "kontaktversuch" as const,
    opt_in_email: true,
    opt_in_whatsapp: false,
    opt_in_telefon: true,
    kontaktversuche: 1,
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "retargeting_winter",
  },
  {
    vorname: "Katharina",
    nachname: "Richter",
    email: "k.richter@posteo.de",
    telefon: "+49 155 9012345",
    source: "landingpage" as const,
    status: "zugewiesen" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: true,
    utm_source: "google",
    utm_medium: "organic",
  },
  {
    vorname: "Stefan",
    nachname: "Braun",
    email: "stefan.braun@web.de",
    telefon: "+49 163 0123456",
    source: "manuell" as const,
    status: "termin" as const,
    opt_in_email: true,
    opt_in_whatsapp: false,
    opt_in_telefon: true,
    custom_fields: { notizen: "Termin am Freitag, 14 Uhr" },
  },
  {
    vorname: "Maria",
    nachname: "Zimmermann",
    email: "m.zimmermann@gmx.de",
    telefon: "+49 171 1122334",
    source: "meta_lead_ad" as const,
    status: "qualifiziert" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: false,
    utm_source: "instagram",
    utm_medium: "story_ad",
    utm_campaign: "neukunden_frühling",
  },
  {
    vorname: "Florian",
    nachname: "Schwarz",
    email: "f.schwarz@outlook.de",
    telefon: "+49 175 2233445",
    source: "landingpage" as const,
    status: "neu" as const,
    opt_in_email: false,
    opt_in_whatsapp: true,
    opt_in_telefon: false,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "performance_max",
  },
  {
    vorname: "Christina",
    nachname: "Hartmann",
    email: "c.hartmann@t-online.de",
    telefon: "+49 179 3344556",
    source: "meta_lead_ad" as const,
    status: "verloren" as const,
    opt_in_email: true,
    opt_in_whatsapp: false,
    opt_in_telefon: false,
    kontaktversuche: 3,
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "lookalike_q4",
  },
  {
    vorname: "Michael",
    nachname: "Krüger",
    email: "m.krueger@yahoo.de",
    telefon: "+49 168 4455667",
    source: "manuell" as const,
    status: "abschluss" as const,
    opt_in_email: true,
    opt_in_whatsapp: true,
    opt_in_telefon: true,
    custom_fields: { notizen: "Abschluss über Empfehlung, Premiumpaket" },
  },
]

export async function POST(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Insert all sample leads
    const { data: createdLeads, error: insertError } = await supabase
      .from("leads")
      .insert(
        SAMPLE_LEADS.map((lead) => ({
          vorname: lead.vorname,
          nachname: lead.nachname,
          email: lead.email,
          telefon: lead.telefon,
          source: lead.source,
          status: lead.status,
          opt_in_email: lead.opt_in_email ?? null,
          opt_in_whatsapp: lead.opt_in_whatsapp ?? null,
          opt_in_telefon: lead.opt_in_telefon ?? null,
          utm_source: lead.utm_source ?? null,
          utm_medium: lead.utm_medium ?? null,
          utm_campaign: lead.utm_campaign ?? null,
          utm_content: (lead as Record<string, unknown>).utm_content as string ?? null,
          custom_fields: lead.custom_fields ?? null,
          kontaktversuche: lead.kontaktversuche ?? 0,
        }))
      )
      .select("id, status")

    if (insertError) {
      console.error("Seed insert error:", insertError)
      return NextResponse.json(
        { error: "Fehler beim Erstellen der Leads", details: insertError.message },
        { status: 500 }
      )
    }

    // Distribute leads that have status "neu" via routing engine
    const neuLeads = (createdLeads ?? []).filter((l) => l.status === "neu")
    let distributedCount = 0

    for (const lead of neuLeads) {
      try {
        // Attempt to call routing distribute endpoint
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ??
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000")

        const res = await fetch(`${baseUrl}/api/routing/distribute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: lead.id }),
        })

        if (res.ok) {
          distributedCount++
        }
      } catch (routeErr) {
        // Routing is optional; log and continue
        console.warn(`Could not distribute lead ${lead.id}:`, routeErr)
      }
    }

    return NextResponse.json({
      success: true,
      created: createdLeads?.length ?? 0,
      distributed: distributedCount,
      leads: (createdLeads ?? []).map((l) => ({
        id: l.id,
        status: l.status,
      })),
    })
  } catch (err) {
    console.error("Seed error:", err)
    return NextResponse.json(
      { error: "Interner Fehler beim Seeding" },
      { status: 500 }
    )
  }
}
