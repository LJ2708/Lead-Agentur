import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'

// ---------------------------------------------------------------------------
// POST - Create a Stripe Checkout Session for subscription
// Body: { paket_id, hat_setter?, berater_id? }
// ---------------------------------------------------------------------------

interface CheckoutBody {
  paket_id: string
  hat_setter?: boolean
  berater_id?: string
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

  let body: CheckoutBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.paket_id) {
    return NextResponse.json({ error: 'Missing paket_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  // --- Look up package ----------------------------------------------------
  const { data: paket, error: paketError } = await admin
    .from('lead_pakete')
    .select('*')
    .eq('id', body.paket_id)
    .eq('is_active', true)
    .single()

  if (paketError || !paket) {
    return NextResponse.json({ error: 'Package not found or inactive' }, { status: 404 })
  }

  const priceId = body.hat_setter ? paket.stripe_price_id_mit_setter : paket.stripe_price_id

  if (!priceId) {
    return NextResponse.json(
      { error: 'Package has no Stripe price configured' },
      { status: 422 }
    )
  }

  // --- Resolve berater_id -------------------------------------------------
  // If berater_id is provided (admin flow), use it. Otherwise find own berater record.
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

  // --- Resolve or create Stripe customer ----------------------------------
  const { data: beraterRecord } = await admin
    .from('berater')
    .select('id, stripe_customer_id')
    .eq('id', beraterId)
    .single()

  const { data: profileData } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profileData) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  let stripeCustomerId = beraterRecord?.stripe_customer_id ?? null

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

  // --- Create Checkout Session --------------------------------------------
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      berater_id: beraterId,
      paket_id: paket.id,
      hat_setter: body.hat_setter ? 'true' : 'false',
      profile_id: profileData.id,
    },
    subscription_data: {
      metadata: {
        berater_id: beraterId,
        paket_id: paket.id,
        hat_setter: body.hat_setter ? 'true' : 'false',
        profile_id: profileData.id,
      },
    },
    success_url: `${appUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
