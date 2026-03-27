import { createAdminClient } from '@/lib/supabase/admin'

const supabaseAdmin = createAdminClient()

export interface BudgetEinnahmen {
  abo: number       // cents
  nachkauf: number  // cents
  setter: number    // cents
  gesamt: number    // cents
}

export interface BudgetZuLiefern {
  abo: number       // lead count
  nachkauf: number  // lead count
  gesamt: number    // lead count
}

export interface BudgetKosten {
  meta: number      // cents
  agentur: number   // cents
  setter: number    // cents
  gesamt: number    // cents
}

export interface BudgetResult {
  einnahmen: BudgetEinnahmen
  zuLiefern: BudgetZuLiefern
  kosten: BudgetKosten
  deckungsbeitrag: number  // cents (einnahmen - kosten)
  marge: number            // percentage 0-100
  benoetigtesMETABudget: number  // cents
  lieferstatus: {
    geliefert: number
    offen: number
    prozent: number
  }
}

/**
 * Default cost assumptions when no system-level config exists.
 * These can be overridden by passing options to calculateBudget.
 */
interface BudgetOptions {
  metaKostenProLeadCents?: number   // Cost per lead from META ads (default: 2500 = 25 EUR)
  agenturFeeProzent?: number        // Agency fee as percentage of revenue (default: 0)
  setterKostenProLeadCents?: number // Cost per setter lead (default: 1500 = 15 EUR)
  metaCplDurchschnittCents?: number // Average META CPL for budget planning (default: 2000 = 20 EUR)
}

/**
 * Calculate full budget overview for the current month.
 * Aggregates all active berater, their packages, and cost assumptions.
 */
export async function calculateBudget(options: BudgetOptions = {}): Promise<BudgetResult> {
  const {
    metaKostenProLeadCents = 2500,
    agenturFeeProzent = 0,
    setterKostenProLeadCents = 1500,
    metaCplDurchschnittCents = 2000,
  } = options

  // Fetch active berater with kontingent info
  const { data: beraterList, error: beraterError } = await supabaseAdmin
    .from('berater')
    .select('id, leads_kontingent, leads_geliefert, hat_setter')
    .eq('status', 'aktiv')

  if (beraterError) {
    throw new Error(`Failed to load berater: ${beraterError.message}`)
  }

  // Fetch active lead_pakete for pricing reference
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _pakete, error: paketError } = await supabaseAdmin
    .from('lead_pakete')
    .select('id, leads_pro_monat, preis_pro_lead_cents, gesamtpreis_cents')
    .eq('is_active', true)

  if (paketError) {
    console.warn('[budget] Failed to load pakete:', paketError.message)
  }

  // Fetch recent zahlungen for this month to calculate actual revenue
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: zahlungen, error: zahlungError } = await supabaseAdmin
    .from('zahlungen')
    .select('betrag_cents, typ, leads_gutgeschrieben')
    .gte('created_at', monthStart)

  if (zahlungError) {
    console.warn('[budget] Failed to load zahlungen:', zahlungError.message)
  }

  const list = beraterList ?? []
  const zahlungenList = zahlungen ?? []

  // Calculate einnahmen from actual payments this month
  let einnahmenAbo = 0
  let einnahmenNachkauf = 0
  const einnahmenSetter = 0 // Setter revenue tracked separately if applicable

  for (const z of zahlungenList) {
    if (z.typ === 'nachkauf') {
      einnahmenNachkauf += z.betrag_cents
    } else {
      einnahmenAbo += z.betrag_cents
    }
  }

  const einnahmenGesamt = einnahmenAbo + einnahmenNachkauf + einnahmenSetter

  // Calculate delivery obligations
  let zuLiefernAbo = 0
  let zuLiefernNachkauf = 0
  let geliefertGesamt = 0

  for (const b of list) {
    zuLiefernAbo += b.leads_kontingent ?? 0
    geliefertGesamt += b.leads_geliefert ?? 0
  }

  // Nachkauf obligations from this month's nachkauf payments
  for (const z of zahlungenList) {
    if (z.typ === 'nachkauf') {
      zuLiefernNachkauf += z.leads_gutgeschrieben ?? 0
    }
  }

  const zuLiefernGesamt = zuLiefernAbo + zuLiefernNachkauf

  // Calculate kosten (costs)
  const metaKosten = zuLiefernGesamt * metaKostenProLeadCents
  const agenturKosten = Math.round(einnahmenGesamt * (agenturFeeProzent / 100))
  // Setter costs based on berater with hat_setter flag
  const setterKosten = list
    .filter(b => b.hat_setter)
    .reduce((sum, b) => sum + (b.leads_kontingent ?? 0) * setterKostenProLeadCents, 0)
  const kostenGesamt = metaKosten + agenturKosten + setterKosten

  // Deckungsbeitrag and margin
  const deckungsbeitrag = einnahmenGesamt - kostenGesamt
  const marge = einnahmenGesamt > 0
    ? Math.round((deckungsbeitrag / einnahmenGesamt) * 10000) / 100
    : 0

  // Required META budget
  const benoetigtesMETABudget = zuLiefernGesamt * metaCplDurchschnittCents

  // Delivery status
  const offeneLeads = zuLiefernGesamt - geliefertGesamt
  const lieferProzent = zuLiefernGesamt > 0
    ? Math.round((geliefertGesamt / zuLiefernGesamt) * 100)
    : 0

  return {
    einnahmen: {
      abo: einnahmenAbo,
      nachkauf: einnahmenNachkauf,
      setter: einnahmenSetter,
      gesamt: einnahmenGesamt,
    },
    zuLiefern: {
      abo: zuLiefernAbo,
      nachkauf: zuLiefernNachkauf,
      gesamt: zuLiefernGesamt,
    },
    kosten: {
      meta: metaKosten,
      agentur: agenturKosten,
      setter: setterKosten,
      gesamt: kostenGesamt,
    },
    deckungsbeitrag,
    marge,
    benoetigtesMETABudget,
    lieferstatus: {
      geliefert: geliefertGesamt,
      offen: Math.max(0, offeneLeads),
      prozent: lieferProzent,
    },
  }
}
