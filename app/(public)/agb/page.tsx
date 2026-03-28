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
        &larr; Zurück zur Startseite
      </Link>

      <h1 className="text-3xl font-bold text-white">
        Allgemeine Geschäftsbedingungen
      </h1>

      <div className="space-y-6 text-gray-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            1. Geltungsbereich
          </h2>
          <p>
            Diese Allgemeinen Geschäftsbedingungen gelten für alle
            Vertragsverhältnisse zwischen der LeadSolution GmbH und ihren Kunden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            2. Vertragsgegenstand
          </h2>
          <p>
            Gegenstand des Vertrags ist die Bereitstellung von qualifizierten
            Leads gemäß dem gewählten Paket des Kunden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            3. Vertragslaufzeit und Kündigung
          </h2>
          <p>
            Die Mindestvertragslaufzeit beträgt 3 Monate. Nach Ablauf der
            Mindestlaufzeit verlängert sich der Vertrag monatlich und kann mit
            einer Frist von 30 Tagen zum Monatsende gekündigt werden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            4. Zahlungsbedingungen
          </h2>
          <p>
            Die Abrechnung erfolgt monatlich im Voraus. Die Zahlung wird
            über den Zahlungsdienstleister Stripe abgewickelt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            5. Haftung
          </h2>
          <p>
            Die Haftung der LeadSolution GmbH ist auf Vorsatz und grobe
            Fahrlässigkeit beschränkt, soweit gesetzlich zulässig.
          </p>
        </section>

        <p className="text-sm text-gray-500">
          Diese AGB sind ein Platzhalter und müssen vor der Veröffentlichung
          durch eine rechtlich geprüfte Version ersetzt werden.
        </p>
      </div>
    </article>
  )
}
