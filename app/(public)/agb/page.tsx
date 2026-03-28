import Link from "next/link"

export const metadata = {
  title: "AGB | LeadSolution",
}

export default function AGBPage() {
  return (
    <article className="space-y-8">
      <Link
        href="/"
        className="inline-block text-sm text-gray-400 transition-colors hover:text-white"
      >
        &larr; Zur\u00fcck zur Startseite
      </Link>

      <h1 className="text-3xl font-bold text-white">
        Allgemeine Gesch\u00e4ftsbedingungen
      </h1>

      <div className="space-y-6 text-gray-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            1. Geltungsbereich
          </h2>
          <p>
            Diese Allgemeinen Gesch\u00e4ftsbedingungen gelten f\u00fcr alle
            Vertragsverh\u00e4ltnisse zwischen der LeadSolution GmbH und ihren Kunden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            2. Vertragsgegenstand
          </h2>
          <p>
            Gegenstand des Vertrags ist die Bereitstellung von qualifizierten
            Leads gem\u00e4\u00df dem gew\u00e4hlten Paket des Kunden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            3. Vertragslaufzeit und K\u00fcndigung
          </h2>
          <p>
            Die Mindestvertragslaufzeit betr\u00e4gt 3 Monate. Nach Ablauf der
            Mindestlaufzeit verl\u00e4ngert sich der Vertrag monatlich und kann mit
            einer Frist von 30 Tagen zum Monatsende gek\u00fcndigt werden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            4. Zahlungsbedingungen
          </h2>
          <p>
            Die Abrechnung erfolgt monatlich im Voraus. Die Zahlung wird
            \u00fcber den Zahlungsdienstleister Stripe abgewickelt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            5. Haftung
          </h2>
          <p>
            Die Haftung der LeadSolution GmbH ist auf Vorsatz und grobe
            Fahrl\u00e4ssigkeit beschr\u00e4nkt, soweit gesetzlich zul\u00e4ssig.
          </p>
        </section>

        <p className="text-sm text-gray-500">
          Diese AGB sind ein Platzhalter und m\u00fcssen vor der Ver\u00f6ffentlichung
          durch eine rechtlich gepr\u00fcfte Version ersetzt werden.
        </p>
      </div>
    </article>
  )
}
