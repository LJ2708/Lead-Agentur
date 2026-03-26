import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributeLeadToBerater } from '@/lib/routing/engine'

// ---------------------------------------------------------------------------
// POST - Trigger lead distribution (admin or CRON_SECRET)
// Body: { lead_id } for a single lead, or omit to distribute all 'neu' leads
// ---------------------------------------------------------------------------

interface DistributeBody {
  lead_id?: string
}

export async function POST(request: NextRequest) {
  // --- Auth: admin or CRON_SECRET ----------------------------------------
  const cronSecret = request.headers.get('x-cron-secret')
  const isValidCron =
    cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET

  if (!isValidCron) {
    // Fall back to user auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 })
    }
  }

  // --- Parse body ---------------------------------------------------------
  let body: DistributeBody = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is fine: distribute all 'neu' leads
  }

  const admin = createAdminClient()
  const results: Array<{ lead_id: string; success: boolean; berater_id?: string; error?: string }> = []

  if (body.lead_id) {
    // Distribute a single lead
    try {
      const result = await distributeLeadToBerater(body.lead_id)
      results.push({
        lead_id: body.lead_id,
        success: true,
        berater_id: result?.beraterId ?? undefined,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      results.push({ lead_id: body.lead_id, success: false, error: message })
    }
  } else {
    // Distribute all leads with status 'neu'
    const { data: newLeads, error } = await admin
      .from('leads')
      .select('id')
      .eq('status', 'neu')
      .order('created_at', { ascending: true })
      .limit(100) // process up to 100 per invocation

    if (error) {
      console.error('[distribute] Failed to fetch new leads:', error.message)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    for (const lead of newLeads ?? []) {
      try {
        const result = await distributeLeadToBerater(lead.id)
        results.push({
          lead_id: lead.id,
          success: true,
          berater_id: result?.beraterId ?? undefined,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ lead_id: lead.id, success: false, error: message })
      }
    }
  }

  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return NextResponse.json({
    total: results.length,
    succeeded,
    failed,
    results,
  })
}
