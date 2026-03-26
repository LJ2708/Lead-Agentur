import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendReminderEmail } from '@/lib/email/client'
import { sendTemplate } from '@/lib/whatsapp/client'
import { buildTemplateParameters } from '@/lib/whatsapp/templates'

// ---------------------------------------------------------------------------
// POST - CRON (every 30 min): Send appointment reminders
//
// - Termine in next 24h -> send 24h reminder (email + WhatsApp if opted in)
// - Termine in next 1h  -> send 1h reminder (email + WhatsApp if opted in)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString()

  const stats = { reminders_24h: 0, reminders_1h: 0, errors: 0 }

  // --- 24h reminders: termine between 23h and 24h from now ----------------
  const { data: termine24h, error: error24h } = await supabase
    .from('termine')
    .select(`
      id, lead_id, berater_id, datum, notizen,
      leads:lead_id(id, vorname, nachname, telefon, opt_in_whatsapp),
      berater:berater_id(id, profile_id)
    `)
    .eq('status', 'geplant')
    .gte('datum', twentyThreeHoursFromNow)
    .lte('datum', twentyFourHoursFromNow)

  if (error24h) {
    console.error('[reminder] Failed to fetch 24h termine:', error24h.message)
  }

  for (const termin of termine24h ?? []) {
    try {
      const lead = termin.leads as unknown as {
        id: string; vorname: string | null; nachname: string | null; telefon: string | null; opt_in_whatsapp: boolean | null
      } | null
      const beraterRecord = termin.berater as unknown as { id: string; profile_id: string } | null

      if (!lead || !beraterRecord) continue

      // Get berater profile
      const { data: beraterProfile } = await supabase
        .from('profiles')
        .select('email, full_name, phone')
        .eq('id', beraterRecord.profile_id)
        .single()

      if (!beraterProfile) continue

      const terminDate = new Date(termin.datum)
      const datumStr = terminDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const uhrzeitStr = terminDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

      // Send email reminder to berater
      await sendReminderEmail({
        beraterEmail: beraterProfile.email,
        beraterName: beraterProfile.full_name ?? 'Berater',
        leadName: `${lead.vorname ?? ''} ${lead.nachname ?? ''}`,
        erinnerungsTyp: `Termin morgen um ${uhrzeitStr} Uhr`,
      })

      // Send WhatsApp to lead if opted in
      if (lead.telefon && lead.opt_in_whatsapp) {
        const params = buildTemplateParameters('termin_erinnerung_24h', {
          lead_name: `${lead.vorname ?? ''} ${lead.nachname ?? ''}`,
          datum: datumStr,
          uhrzeit: uhrzeitStr,
          berater_name: beraterProfile.full_name ?? 'Berater',
        })

        const result = await sendTemplate(lead.telefon, 'termin_erinnerung_24h', params)

        // Record the message
        await supabase.from('nachrichten').insert({
          lead_id: lead.id,
          channel: 'whatsapp',
          direction: 'ausgehend',
          body: `Template: termin_erinnerung_24h (Termin: ${datumStr} ${uhrzeitStr})`,
          sent_at: result.success ? new Date().toISOString() : null,
          whatsapp_message_id: result.messageId ?? null,
          error: result.error ?? null,
        })
      }

      stats.reminders_24h++
    } catch (err) {
      console.error(`[reminder] Error processing 24h reminder for termin ${termin.id}:`, err)
      stats.errors++
    }
  }

  // --- 1h reminders: termine between now and 1h from now ------------------
  const { data: termine1h, error: error1h } = await supabase
    .from('termine')
    .select(`
      id, lead_id, berater_id, datum, notizen,
      leads:lead_id(id, vorname, nachname, telefon, opt_in_whatsapp),
      berater:berater_id(id, profile_id)
    `)
    .eq('status', 'geplant')
    .gte('datum', now.toISOString())
    .lte('datum', oneHourFromNow)

  if (error1h) {
    console.error('[reminder] Failed to fetch 1h termine:', error1h.message)
  }

  for (const termin of termine1h ?? []) {
    try {
      const lead = termin.leads as unknown as {
        id: string; vorname: string | null; nachname: string | null; telefon: string | null; opt_in_whatsapp: boolean | null
      } | null
      const beraterRecord = termin.berater as unknown as { id: string; profile_id: string } | null

      if (!lead || !beraterRecord) continue

      // Check if 1h reminder was already sent (check nachrichten for this termin)
      const terminDate = new Date(termin.datum)
      const uhrzeitStr = terminDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

      // Look for a 1h reminder nachrichten entry to avoid duplicates
      const { data: existing1hReminder } = await supabase
        .from('nachrichten')
        .select('id')
        .eq('lead_id', lead.id)
        .ilike('body', '%termin_erinnerung_1h%')
        .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle()

      if (existing1hReminder) continue

      const { data: beraterProfile } = await supabase
        .from('profiles')
        .select('email, full_name, phone')
        .eq('id', beraterRecord.profile_id)
        .single()

      if (!beraterProfile) continue

      // Send email reminder to berater
      await sendReminderEmail({
        beraterEmail: beraterProfile.email,
        beraterName: beraterProfile.full_name ?? 'Berater',
        leadName: `${lead.vorname ?? ''} ${lead.nachname ?? ''}`,
        erinnerungsTyp: `Termin in 1 Stunde um ${uhrzeitStr} Uhr`,
      })

      // Send WhatsApp to lead if opted in
      if (lead.telefon && lead.opt_in_whatsapp) {
        const params = buildTemplateParameters('termin_erinnerung_1h', {
          lead_name: `${lead.vorname ?? ''} ${lead.nachname ?? ''}`,
          uhrzeit: uhrzeitStr,
          berater_name: beraterProfile.full_name ?? 'Berater',
        })

        const result = await sendTemplate(lead.telefon, 'termin_erinnerung_1h', params)

        await supabase.from('nachrichten').insert({
          lead_id: lead.id,
          channel: 'whatsapp',
          direction: 'ausgehend',
          body: `Template: termin_erinnerung_1h (Termin: ${uhrzeitStr})`,
          sent_at: result.success ? new Date().toISOString() : null,
          whatsapp_message_id: result.messageId ?? null,
          error: result.error ?? null,
        })
      }

      stats.reminders_1h++
    } catch (err) {
      console.error(`[reminder] Error processing 1h reminder for termin ${termin.id}:`, err)
      stats.errors++
    }
  }

  return NextResponse.json({
    processed_24h: termine24h?.length ?? 0,
    processed_1h: termine1h?.length ?? 0,
    ...stats,
  })
}
