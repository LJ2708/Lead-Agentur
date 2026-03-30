import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe/client"
import { calcPreisProLead, SETTER_AUFPREIS } from "@/lib/pricing/calculator"

/**
 * POST /api/stripe/update-subscription
 * Updates the berater's Stripe subscription when toggling setter on/off.
 * Body: { action: 'add_setter' | 'remove_setter' }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body as { action: "add_setter" | "remove_setter" }

    if (!["add_setter", "remove_setter"].includes(action)) {
      return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 })
    }

    // Get berater record
    const admin = createAdminClient()
    const { data: berater } = await admin
      .from("berater")
      .select("*")
      .eq("profile_id", user.id)
      .single()

    if (!berater) {
      return NextResponse.json({ error: "Berater nicht gefunden" }, { status: 404 })
    }

    const addSetter = action === "add_setter"
    const newSetterTyp = addSetter ? "pool" : "keiner"
    const leadsProMonat = berater.leads_pro_monat
    const preisProLead = calcPreisProLead(leadsProMonat) * 100 // cents
    const setterAufpreis = addSetter ? SETTER_AUFPREIS * 100 : 0 // cents
    const newUnitAmount = preisProLead + setterAufpreis

    // Try to update Stripe subscription if it exists
    if (berater.stripe_subscription_id && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("placeholder")) {
      try {
        const subscription = await stripe.subscriptions.retrieve(berater.stripe_subscription_id)
        const itemId = subscription.items.data[0]?.id

        if (itemId) {
          // Get the product from the current price
          const currentPrice = subscription.items.data[0]?.price
          const productId = typeof currentPrice?.product === "string"
            ? currentPrice.product
            : currentPrice?.product?.id

          if (productId) {
            await stripe.subscriptions.update(berater.stripe_subscription_id, {
              items: [{
                id: itemId,
                price_data: {
                  currency: "eur",
                  product: productId,
                  unit_amount: newUnitAmount,
                  recurring: { interval: "month" },
                },
                quantity: leadsProMonat,
              }],
              proration_behavior: "create_prorations",
              metadata: {
                leads_pro_monat: String(leadsProMonat),
                preis_pro_lead_cents: String(preisProLead),
                hat_setter: String(addSetter),
              },
            })
          }
        }
      } catch (stripeError) {
        console.error("Stripe update failed:", stripeError)
        // Continue anyway — update DB even if Stripe fails
      }
    }

    // Update berater record
    const { error: updateError } = await admin
      .from("berater")
      .update({ setter_typ: newSetterTyp })
      .eq("id", berater.id)

    if (updateError) {
      return NextResponse.json({ error: "Update fehlgeschlagen" }, { status: 500 })
    }

    // Calculate new monthly price for response
    const monatspreis = leadsProMonat * newUnitAmount

    return NextResponse.json({
      success: true,
      setter_typ: newSetterTyp,
      monatspreis_cents: monatspreis,
      preis_pro_lead_cents: newUnitAmount,
    })
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 })
  }
}
