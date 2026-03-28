import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/client'

// ---------------------------------------------------------------------------
// POST - Send a transactional email (admin/system only)
// Body: { to, template, data }
// ---------------------------------------------------------------------------

interface SendBody {
  to: string | string[]
  template: string
  data: {
    subject: string
    html: string
    [key: string]: unknown
  }
}

export async function POST(request: NextRequest) {
  // --- Auth: CRON_SECRET or admin user ------------------------------------
  const cronSecret = request.headers.get('x-cron-secret')
  const isValidCron =
    cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET

  if (!isValidCron) {
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
  let body: SendBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.to || !body.data?.subject || !body.data?.html) {
    return NextResponse.json(
      { error: 'Missing required fields: to, data.subject, data.html' },
      { status: 400 }
    )
  }

  // --- Send email ---------------------------------------------------------
  const recipients = Array.isArray(body.to) ? body.to : [body.to]
  let lastResult = false

  for (const recipient of recipients) {
    lastResult = await sendEmail(recipient, body.data.subject, body.data.html)
  }

  if (!lastResult && recipients.length === 1) {
    return NextResponse.json(
      { error: 'Email send failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
