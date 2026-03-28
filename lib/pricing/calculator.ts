// Configurable defaults (overridable from pricing_config table)
const MAX_PRICE = 59 // EUR/lead at minimum leads
const MIN_PRICE = 39 // EUR/lead at maximum leads
const MIN_LEADS = 10
const MAX_LEADS = 50
const SETTER_AUFPREIS = 10 // EUR/lead extra for setter
const SETTER_VERGUETUNG = 8 // EUR/lead paid to setter
const MINDESTLAUFZEIT = 3 // months

/**
 * Calculate the price per lead (in EUR, whole number) for a given number of leads.
 * Uses linear degressive pricing from MAX_PRICE (at MIN_LEADS) to MIN_PRICE (at MAX_LEADS).
 */
export function calcPreisProLead(leads: number): number {
  if (leads >= MAX_LEADS) return MIN_PRICE
  if (leads <= MIN_LEADS) return MAX_PRICE
  return Math.round(
    MAX_PRICE -
      ((leads - MIN_LEADS) / (MAX_LEADS - MIN_LEADS)) * (MAX_PRICE - MIN_PRICE)
  )
}

export interface PricingResult {
  leads: number
  preisProLead: number // cents
  setterProLead: number // cents (0 or SETTER_AUFPREIS * 100)
  gesamtProLead: number // cents
  monatspreis: number // cents
  ersparnis: number // cents vs max price for all leads
  ersparnisProLead: number // cents
  isEnterprise: boolean // leads >= 50
  mindestlaufzeit: number
}

/**
 * Calculate the full pricing breakdown for a given number of leads and setter option.
 */
export function calcGesamtpreis(
  leads: number,
  hatSetter: boolean
): PricingResult {
  const clamped = Math.max(MIN_LEADS, Math.min(leads, MAX_LEADS))
  const preisEuro = calcPreisProLead(clamped)
  const preisProLead = preisEuro * 100
  const setterProLead = hatSetter ? SETTER_AUFPREIS * 100 : 0
  const gesamtProLead = preisProLead + setterProLead
  const monatspreis = gesamtProLead * clamped
  const maxPreisProLead = MAX_PRICE * 100
  const ersparnisProLead = maxPreisProLead - preisProLead
  const ersparnis = ersparnisProLead * clamped

  return {
    leads: clamped,
    preisProLead,
    setterProLead,
    gesamtProLead,
    monatspreis,
    ersparnis,
    ersparnisProLead,
    isEnterprise: leads >= MAX_LEADS,
    mindestlaufzeit: MINDESTLAUFZEIT,
  }
}

/**
 * Format cents to a German price string like "59,00 EUR" or "59 EUR".
 */
export function formatPreis(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(euros)
}

/**
 * Format cents to a short German price string like "59EUR".
 */
export function formatPreisKurz(cents: number): string {
  const euros = cents / 100
  if (Number.isInteger(euros)) {
    return `${euros}\u202F\u20AC`
  }
  return `${euros.toFixed(2).replace(".", ",")}\u202F\u20AC`
}

export {
  MAX_PRICE,
  MIN_PRICE,
  MIN_LEADS,
  MAX_LEADS,
  SETTER_AUFPREIS,
  SETTER_VERGUETUNG,
  MINDESTLAUFZEIT,
}
