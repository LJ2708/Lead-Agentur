import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'

// ---------------------------------------------------------------------------
// POST - Create Stripe Checkout Session for one-time lead top-up (dynamic)
// Body: { berater_id, anzahl_leads }
// ---------------------------------------------------------------------------

interface NachkaufBody {
  berater_id?: string
  anzahl_leads: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: NachkaufBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { anzahl_leads } = body

  if (!anzahl_leads || typeof anzahl_leads !== 'number' || anzahl_leads < 1) {
    return NextResponse.json({ error: 'Missing or invalid anzahl_leads' }, { status: 400 })
  }

  const admin = createAdminClient()

  // --- Resolve berater_id -------------------------------------------------
  let beraterId = body.berater_id

  if (!beraterId) {
    const { data: berater } = await admin
      .from('berater')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!berater) {
      return NextResponse.json({ error: 'No berater record found for user' }, { status: 404 })
    }
    beraterId = berater.id
  }

  // --- Look up berater to get their current preis_pro_lead_cents ----------
  const { data: beraterRecord } = await admin
    .from('berater')
    .select('id, stripe_customer_id, preis_pro_lead_cents, subscription_status')
    .eq('id', beraterId)
    .single()

  if (!beraterRecord) {
    return NextResponse.json({ error: 'Berater not found' }, { status: 404 })
  }

  const { data: profileData } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profileData) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // --- Resolve or create Stripe customer ----------------------------------
  let stripeCustomerId = beraterRecord.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profileData.email,
      name: profileData.full_name ?? profileData.email,
      metadata: { profile_id: profileData.id, berater_id: beraterId },
    })
    stripeCustomerId = customer.id

    await admin
      .from('berater')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', beraterId)
  }

  // --- Create Checkout Session (payment mode) -----------------------------
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const preisProLeadCents = beraterRecord.preis_pro_lead_cents

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `LeadSolution Nachkauf \u2014 ${anzahl_leads} Leads`,
          },
          unit_amount: preisProLeadCents,
        },
        quantity: anzahl_leads,
      },
    ],
    metadata: {
      berater_id: beraterId,
      anzahl_leads: String(anzahl_leads),
      typ: 'nachkauf',
    },
    success_url: `${appUrl}/berater?nachkauf=success`,
    cancel_url: `${appUrl}/berater?nachkauf=cancel`,
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
