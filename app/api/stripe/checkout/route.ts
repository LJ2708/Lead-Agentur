import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'
import { calcGesamtpreis } from '@/lib/pricing/calculator'

// ---------------------------------------------------------------------------
// POST - Create a Stripe Checkout Session for subscription (dynamic pricing)
// Body: { berater_id, leads_pro_monat, hat_setter }
// ---------------------------------------------------------------------------

interface CheckoutBody {
  berater_id?: string
  leads_pro_monat: number
  hat_setter: boolean
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

  const { leads_pro_monat, hat_setter } = body

  if (!leads_pro_monat || typeof leads_pro_monat !== 'number' || leads_pro_monat < 1) {
    return NextResponse.json({ error: 'Missing or invalid leads_pro_monat' }, { status: 400 })
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

  // --- Calculate dynamic pricing ------------------------------------------
  const pricing = calcGesamtpreis(leads_pro_monat, hat_setter)
  const preisProLead = pricing.preisProLead // cents
  const setterProLead = pricing.setterProLead // cents
  const gesamtProLead = pricing.gesamtProLead // cents

  // --- Create Checkout Session --------------------------------------------
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `LeadSolution \u2014 ${leads_pro_monat} Leads/Monat`,
            description: hat_setter
              ? `${leads_pro_monat} Leads \u00d7 ${preisProLead / 100}\u20ac + Setter (${setterProLead / 100}\u20ac/Lead)`
              : `${leads_pro_monat} Leads \u00d7 ${preisProLead / 100}\u20ac`,
          },
          unit_amount: gesamtProLead,
          recurring: { interval: 'month' },
        },
        quantity: leads_pro_monat,
      },
    ],
    metadata: {
      berater_id: beraterId,
      leads_pro_monat: String(leads_pro_monat),
      preis_pro_lead_cents: String(preisProLead),
      hat_setter: String(hat_setter),
    },
    subscription_data: {
      metadata: {
        berater_id: beraterId,
        leads_pro_monat: String(leads_pro_monat),
        preis_pro_lead_cents: String(preisProLead),
        hat_setter: String(hat_setter),
      },
    },
    success_url: `${appUrl}/berater?checkout=success`,
    cancel_url: `${appUrl}/berater?checkout=cancel`,
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
