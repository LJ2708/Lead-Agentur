import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributeLeadToBerater } from '@/lib/routing/engine'
import { sendReminderEmail, sendAdminAlertEmail } from '@/lib/email/client'

// ---------------------------------------------------------------------------
// POST - CRON (every 5 min): Handle lead reassignment for uncontacted leads
//
// Thresholds:
//   > 30 min since zugewiesen_am, no contact -> send reminder to berater
//   > 2 h since zugewiesen_am, no contact    -> auto-reassign to another berater
//   > 5 h since zugewiesen_am, no contact    -> send admin alert
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  const { verifyCronAuth } = await import('@/lib/cron/auth')
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  // Thresholds
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
  const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()

  // Find all zugewiesen leads with no contact (erster_kontakt_am is null)
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, vorname, nachname, berater_id, zugewiesen_am, erster_kontakt_am')
    .eq('status', 'zugewiesen')
    .is('erster_kontakt_am', null)
    .not('berater_id', 'is', null)
    .not('zugewiesen_am', 'is', null)
    .lte('zugewiesen_am', thirtyMinAgo)

  if (error) {
    console.error('[rueckvergabe] Failed to fetch leads:', error.message)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  const stats = { reminders_sent: 0, reassigned: 0, admin_alerts: 0, sla_breached: 0, errors: 0 }

  // --- SLA Breach Detection ---
  const { data: slaBreachedLeads, error: slaError } = await supabase
    .from('leads')
    .select('id, berater_id, vorname, nachname, previous_berater_ids, reassignment_count')
    .eq('sla_status', 'active')
    .lte('sla_deadline', now.toISOString())
    .not('berater_id', 'is', null)

  if (slaError) {
    console.error('[rueckvergabe] Failed to fetch SLA breached leads:', slaError.message)
  }

  for (const slaLead of slaBreachedLeads ?? []) {
    try {
      const previousBeraterId = slaLead.berater_id!
      const previousIds: string[] = Array.isArray(slaLead.previous_berater_ids)
        ? [...slaLead.previous_berater_ids]
        : []
      if (!previousIds.includes(previousBeraterId)) {
        previousIds.push(previousBeraterId)
      }

      // Mark SLA as breached and reset for redistribution
      await supabase
        .from('leads')
        .update({
          sla_status: 'breached',
          status: 'neu',
          berater_id: null,
          zugewiesen_am: null,
          accepted_at: null,
          accepted_by: null,
          reassignment_count: (slaLead.reassignment_count ?? 0) + 1,
          previous_berater_ids: previousIds,
        })
        .eq('id', slaLead.id)

      // Close old assignment
      await supabase
        .from('lead_assignments')
        .update({ is_active: false })
        .eq('lead_id', slaLead.id)
        .eq('berater_id', previousBeraterId)
        .eq('is_active', true)

      // Decrement old berater leads_geliefert
      const { data: oldBerater } = await supabase
        .from('berater')
        .select('leads_geliefert')
        .eq('id', previousBeraterId)
        .single()

      if (oldBerater) {
        await supabase
          .from('berater')
          .update({ leads_geliefert: Math.max(0, oldBerater.leads_geliefert - 1) })
          .eq('id', previousBeraterId)
      }

      // Create activity
      await supabase.from('lead_activities').insert({
        lead_id: slaLead.id,
        type: 'system',
        title: 'SLA \u00fcberschritten - Lead umverteilt',
        description: `SLA-Frist abgelaufen. Lead wird an neuen Berater umverteilt (vorheriger Berater: ${previousBeraterId})`,
      })

      // Redistribute
      try {
        await distributeLeadToBerater(slaLead.id)
      } catch (redistributeErr) {
        console.error(`[rueckvergabe] SLA redistribution failed for lead ${slaLead.id}:`, redistributeErr)
      }

      stats.sla_breached++
    } catch (slaProcessErr) {
      console.error(`[rueckvergabe] Error processing SLA breach for lead ${slaLead.id}:`, slaProcessErr)
      stats.errors++
    }
  }

  // --- Existing time-based reassignment logic ---
  for (const lead of leads ?? []) {
    const zugewiesenAm = new Date(lead.zugewiesen_am!).getTime()

    try {
      // --- >5h: Admin alert -----------------------------------------------
      if (zugewiesenAm <= new Date(fiveHoursAgo).getTime()) {
        // Check if we already sent this alert (look for system activity in last 5h)
        const { data: existingAlert } = await supabase
          .from('lead_activities')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('type', 'system')
          .ilike('description', '%Admin-Alert%5h%')
          .limit(1)
          .maybeSingle()

        if (!existingAlert) {
          await sendAdminAlertEmail({
            subject: `Lead ${lead.vorname} ${lead.nachname} seit >5h unkontaktiert`,
            nachricht: `Der Lead "${lead.vorname} ${lead.nachname}" (ID: ${lead.id}) ist seit ueber 5 Stunden zugewiesen aber wurde nicht kontaktiert.`,
            details: {
              lead_id: lead.id,
              zugewiesen_am: lead.zugewiesen_am,
              berater_id: lead.berater_id,
            },
          })

          await supabase.from('lead_activities').insert({
            lead_id: lead.id,
            type: 'system',
            title: 'Admin-Alert',
            description: 'Admin-Alert: Lead seit >5h unkontaktiert',
          })

          stats.admin_alerts++
        }
      }

      // --- >2h: Auto-reassign --------------------------------------------
      if (
        zugewiesenAm <= new Date(twoHoursAgo).getTime() &&
        zugewiesenAm > new Date(fiveHoursAgo).getTime()
      ) {
        // Check if already reassigned for this cycle
        const { data: existingReassign } = await supabase
          .from('lead_activities')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('type', 'rueckvergabe')
          .gte('created_at', twoHoursAgo)
          .limit(1)
          .maybeSingle()

        if (!existingReassign) {
          const previousBeraterId = lead.berater_id!

          // Close old assignment
          await supabase
            .from('lead_assignments')
            .update({ is_active: false })
            .eq('lead_id', lead.id)
            .eq('berater_id', previousBeraterId)
            .eq('is_active', true)

          // Decrement old berater leads_geliefert
          const { data: oldBerater } = await supabase
            .from('berater')
            .select('leads_geliefert')
            .eq('id', previousBeraterId)
            .single()

          if (oldBerater) {
            await supabase
              .from('berater')
              .update({ leads_geliefert: Math.max(0, oldBerater.leads_geliefert - 1) })
              .eq('id', previousBeraterId)
          }

          // Reset lead for redistribution
          await supabase
            .from('leads')
            .update({
              status: 'neu',
              berater_id: null,
              zugewiesen_am: null,
              rueckvergabe_count: (lead as unknown as { rueckvergabe_count: number }).rueckvergabe_count + 1,
            })
            .eq('id', lead.id)

          // Create activity
          await supabase.from('lead_activities').insert({
            lead_id: lead.id,
            type: 'rueckvergabe',
            title: 'Auto-Rueckvergabe',
            description: `Auto-Rueckvergabe: Lead seit >2h unkontaktiert (vorheriger Berater: ${previousBeraterId})`,
          })

          // Redistribute (the engine will exclude the previous berater via its own logic)
          try {
            await distributeLeadToBerater(lead.id)
          } catch (err) {
            console.error(`[rueckvergabe] Redistribution failed for lead ${lead.id}:`, err)
          }

          stats.reassigned++
        }
      }

      // --- >30min: Reminder -----------------------------------------------
      if (
        zugewiesenAm <= new Date(thirtyMinAgo).getTime() &&
        zugewiesenAm > new Date(twoHoursAgo).getTime()
      ) {
        // Check if reminder was already sent
        const { data: existingReminder } = await supabase
          .from('lead_activities')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('type', 'system')
          .ilike('description', '%Erinnerung%30min%')
          .limit(1)
          .maybeSingle()

        if (!existingReminder) {
          // Get berater info for email
          const { data: berater } = await supabase
            .from('berater')
            .select('profile_id')
            .eq('id', lead.berater_id!)
            .single()

          if (berater) {
            const { data: beraterProfile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', berater.profile_id)
              .single()

            if (beraterProfile) {
              await sendReminderEmail({
                beraterEmail: beraterProfile.email,
                beraterName: beraterProfile.full_name ?? 'Berater',
                leadName: `${lead.vorname} ${lead.nachname}`,
                erinnerungsTyp: 'Lead seit 30 Minuten unkontaktiert - bitte schnellstmoeglich anrufen!',
              })
            }
          }

          await supabase.from('lead_activities').insert({
            lead_id: lead.id,
            type: 'system',
            title: 'Erinnerung',
            description: 'Erinnerung: Lead seit >30min unkontaktiert gesendet',
          })

          stats.reminders_sent++
        }
      }
    } catch (err) {
      console.error(`[rueckvergabe] Error processing lead ${lead.id}:`, err)
      stats.errors++
    }
  }

  return NextResponse.json({
    processed: leads?.length ?? 0,
    ...stats,
  })
}
