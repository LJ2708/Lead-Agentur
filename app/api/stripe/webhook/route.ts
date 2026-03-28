import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'
import type Stripe from 'stripe'

// ---------------------------------------------------------------------------
// POST - Stripe webhook handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 401 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe-webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err)
    // Still return 200 to prevent Stripe from retrying (we logged the error)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata ?? {}
  const beraterId = metadata.berater_id

  if (!beraterId) {
    console.error('[stripe-webhook] checkout.session.completed: missing berater_id in metadata')
    return
  }

  if (session.mode === 'subscription') {
    // --- Subscription checkout completed (dynamic pricing) -----------------
    const leadsProMonat = parseInt(metadata.leads_pro_monat ?? '0', 10)
    const preisProLeadCents = parseInt(metadata.preis_pro_lead_cents ?? '0', 10)
    const hatSetter = metadata.hat_setter === 'true'

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription | null)?.id ?? null

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id ?? null

    // Activate berater with subscription info
    await supabase
      .from('berater')
      .update({
        status: 'aktiv',
        subscription_status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        leads_kontingent: leadsProMonat,
        leads_geliefert: 0,
        leads_pro_monat: leadsProMonat,
        preis_pro_lead_cents: preisProLeadCents,
        hat_setter: hatSetter,
        setter_typ: hatSetter ? 'pool' : 'keiner',
        abo_start: new Date().toISOString(),
      })
      .eq('id', beraterId)

    // Create zahlungen record
    await supabase.from('zahlungen').insert({
      berater_id: beraterId,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null,
      betrag_cents: session.amount_total ?? 0,
      typ: 'subscription',
      paket_name: hatSetter
        ? `${leadsProMonat} Leads/Monat (mit Setter)`
        : `${leadsProMonat} Leads/Monat`,
      leads_gutgeschrieben: leadsProMonat,
      preis_pro_lead_cents: preisProLeadCents,
      hat_setter: hatSetter,
    })
  } else if (session.mode === 'payment') {
    // --- One-time nachkauf payment completed -------------------------------
    const anzahlLeads = parseInt(metadata.anzahl_leads ?? '0', 10)

    // Add leads to berater nachkauf_leads_offen
    const { data: berater } = await supabase
      .from('berater')
      .select('nachkauf_leads_offen, preis_pro_lead_cents')
      .eq('id', beraterId)
      .single()

    if (berater) {
      await supabase
        .from('berater')
        .update({
          nachkauf_leads_offen: (berater.nachkauf_leads_offen ?? 0) + anzahlLeads,
        })
        .eq('id', beraterId)
    }

    // Create zahlungen record
    await supabase.from('zahlungen').insert({
      berater_id: beraterId,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null,
      betrag_cents: session.amount_total ?? 0,
      typ: 'nachkauf',
      leads_gutgeschrieben: anzahlLeads,
      paket_name: `Nachkauf: ${anzahlLeads} Leads`,
      preis_pro_lead_cents: berater?.preis_pro_lead_cents ?? 0,
      hat_setter: false,
    })
  }
}

// ---------------------------------------------------------------------------
// Helpers for new Stripe API version (2026-03-25.dahlia)
// subscription is now under parent.subscription_details.subscription
// ---------------------------------------------------------------------------

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

// ---------------------------------------------------------------------------
// invoice.paid (recurring subscription renewal)
// ---------------------------------------------------------------------------

async function handleInvoicePaid(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  // Only process subscription invoices (not the first one - handled by checkout)
  if (invoice.billing_reason === 'subscription_create') {
    return
  }

  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  // Find the berater by stripe_subscription_id
  const { data: berater } = await supabase
    .from('berater')
    .select('id, leads_kontingent, leads_pro_monat')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!berater) {
    console.error(`[stripe-webhook] invoice.paid: no berater found for subscription ${subscriptionId}`)
    return
  }

  // Use leads_pro_monat as the kontingent for renewal
  const kontingent = berater.leads_pro_monat ?? berater.leads_kontingent

  // Reset leads_geliefert for the new period
  await supabase
    .from('berater')
    .update({
      subscription_status: 'active',
      leads_kontingent: kontingent,
      leads_geliefert: 0,
      kontingent_reset_at: new Date().toISOString(),
    })
    .eq('id', berater.id)

  // Create zahlungen record
  await supabase.from('zahlungen').insert({
    berater_id: berater.id,
    stripe_invoice_id: invoice.id,
    betrag_cents: invoice.amount_paid ?? 0,
    typ: 'subscription_renewal',
    leads_gutgeschrieben: kontingent,
    paket_name: 'Abo-Verlängerung',
  })
}

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  await supabase
    .from('berater')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId)
}

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const { data: berater } = await supabase
    .from('berater')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!berater) {
    console.error(
      `[stripe-webhook] subscription.deleted: no berater for subscription ${subscription.id}`
    )
    return
  }

  await supabase
    .from('berater')
    .update({ subscription_status: 'canceled', status: 'inaktiv' })
    .eq('id', berater.id)
}
