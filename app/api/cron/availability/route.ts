import { NextResponse } from 'next/server'
import { updateAllAvailability } from '@/lib/availability/engine'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributeLeadToBerater } from '@/lib/routing/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * CRON endpoint: runs every minute to update berater availability
 * and process the holding queue.
 *
 * Secured via CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Update all berater availability statuses
    const availabilityStats = await updateAllAvailability()

    // 2. Process holding queue — find leads waiting for assignment
    const supabaseAdmin = createAdminClient()
    const { data: holdingLeads, error: holdingError } = await supabaseAdmin
      .from('leads')
      .select('id, berater_id')
      .eq('queue_status', 'holding')
      .order('created_at', { ascending: true })
      .limit(50)

    if (holdingError) {
      console.error('[cron/availability] Failed to load holding leads:', holdingError.message)
      return NextResponse.json({
        availability: availabilityStats,
        queue: { error: holdingError.message },
      })
    }

    let assigned = 0
    let stillHolding = 0

    if (holdingLeads && holdingLeads.length > 0 && availabilityStats.available > 0) {
      for (const lead of holdingLeads) {
        try {
          const result = await distributeLeadToBerater(lead.id)
          if (result) {
            assigned++
          } else {
            stillHolding++
            // Once we fail to assign, remaining leads will also fail
            break
          }
        } catch (err) {
          console.error(`[cron/availability] Failed to distribute lead ${lead.id}:`, err)
          stillHolding++
        }
      }

      // Count remaining unprocessed leads
      stillHolding += Math.max(0, holdingLeads.length - assigned - stillHolding)
    } else {
      stillHolding = holdingLeads?.length ?? 0
    }

    return NextResponse.json({
      ok: true,
      availability: availabilityStats,
      queue: {
        total_holding: holdingLeads?.length ?? 0,
        assigned,
        still_holding: stillHolding,
      },
    })
  } catch (err) {
    console.error('[cron/availability] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
