import { createAdminClient } from '@/lib/supabase/admin'
import { SETTER_AUFPREIS, SETTER_VERGUETUNG } from '@/lib/pricing/calculator'

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
  setterMarge: number      // cents
  benoetigtesMETABudget: number  // cents
  lieferstatus: {
    geliefert: number
    offen: number
    prozent: number
  }
}

/**
 * Calculate full budget overview for the current month.
 * Uses flexible per-berater pricing (leads_pro_monat * preis_pro_lead_cents).
 */
export async function calculateBudget(): Promise<BudgetResult> {
  // Fetch budget_config for meta_cpl and agentur costs
  const { data: configData } = await supabaseAdmin
    .from('budget_config')
    .select('key, value')

  const configMap: Record<string, number> = {}
  for (const c of configData ?? []) {
    configMap[c.key] = c.value
  }

  const metaCplCents = configMap['meta_cpl'] ?? 2000 // default 20 EUR
  const agenturKostenCents = configMap['agentur_kosten'] ?? 0 // fixed monthly

  // Fetch pricing_config for setter_verguetung_cents
  const { data: pricingConfig } = await supabaseAdmin
    .from('pricing_config')
    .select('key, value')
    .in('key', ['setter_verguetung_cents'])

  let setterVerguetungCents = SETTER_VERGUETUNG * 100
  for (const c of pricingConfig ?? []) {
    if (c.key === 'setter_verguetung_cents') {
      setterVerguetungCents = c.value
    }
  }

  const setterAufpreisCents = SETTER_AUFPREIS * 100

  // Fetch active berater with individual pricing
  const { data: beraterList, error: beraterError } = await supabaseAdmin
    .from('berater')
    .select('id, leads_pro_monat, preis_pro_lead_cents, leads_kontingent, leads_geliefert, nachkauf_leads_offen, setter_typ')
    .eq('status', 'aktiv')

  if (beraterError) {
    throw new Error(`Failed to load berater: ${beraterError.message}`)
  }

  const list = beraterList ?? []

  // EINNAHMEN: Abo-Umsatz from individual berater pricing
  let einnahmenAbo = 0
  let einnahmenSetter = 0
  let setterLeadsCount = 0

  for (const b of list) {
    // Abo revenue: leads_pro_monat * preis_pro_lead_cents
    einnahmenAbo += (b.leads_pro_monat ?? 0) * (b.preis_pro_lead_cents ?? 0)

    // Setter-Addon: berater with setter_typ='pool' pay SETTER_AUFPREIS per lead
    if (b.setter_typ === 'pool') {
      const beraterLeads = b.leads_pro_monat ?? 0
      einnahmenSetter += beraterLeads * setterAufpreisCents
      setterLeadsCount += beraterLeads
    }
  }

  // Nachkauf-Umsatz from zahlungen this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: zahlungen } = await supabaseAdmin
    .from('zahlungen')
    .select('betrag_cents, typ, leads_gutgeschrieben')
    .gte('created_at', monthStart)

  const zahlungenList = zahlungen ?? []

  let einnahmenNachkauf = 0
  let zuLiefernNachkauf = 0

  for (const z of zahlungenList) {
    if (z.typ === 'nachkauf') {
      einnahmenNachkauf += z.betrag_cents
      zuLiefernNachkauf += z.leads_gutgeschrieben ?? 0
    }
  }

  const einnahmenGesamt = einnahmenAbo + einnahmenNachkauf + einnahmenSetter

  // ZU LIEFERN
  let zuLiefernAbo = 0
  let geliefertGesamt = 0

  for (const b of list) {
    zuLiefernAbo += b.leads_kontingent ?? 0
    geliefertGesamt += b.leads_geliefert ?? 0
  }

  const zuLiefernGesamt = zuLiefernAbo + zuLiefernNachkauf

  // KOSTEN
  const metaKosten = zuLiefernGesamt * metaCplCents
  const agenturKosten = agenturKostenCents
  const setterKosten = setterLeadsCount * setterVerguetungCents
  const kostenGesamt = metaKosten + agenturKosten + setterKosten

  // ERGEBNIS
  const deckungsbeitrag = einnahmenGesamt - kostenGesamt
  const marge = einnahmenGesamt > 0
    ? Math.round((deckungsbeitrag / einnahmenGesamt) * 10000) / 100
    : 0

  // Setter-Marge separat: (Aufpreis - Vergütung) * setter_leads
  const setterMarge = setterLeadsCount * (setterAufpreisCents - setterVerguetungCents)

  // Benötigtes META-Budget
  const benoetigtesMETABudget = zuLiefernGesamt * metaCplCents

  // Lieferstatus
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
    setterMarge,
    benoetigtesMETABudget,
    lieferstatus: {
      geliefert: geliefertGesamt,
      offen: Math.max(0, offeneLeads),
      prozent: lieferProzent,
    },
  }
}
