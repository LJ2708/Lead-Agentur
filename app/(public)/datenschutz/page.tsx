import Link from "next/link"

export const metadata = {
  title: "Datenschutzerkl\u00e4rung | LeadSolution",
}

export default function DatenschutzPage() {
  return (
    <article className="space-y-8">
      <Link
        href="/"
        className="inline-block text-sm text-gray-400 transition-colors hover:text-white"
      >
        &larr; Zur\u00fcck zur Startseite
      </Link>

      <h1 className="text-3xl font-bold text-white">
        Datenschutzerkl\u00e4rung
      </h1>

      <div className="space-y-6 text-gray-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            1. Verantwortlicher
          </h2>
          <p>
            Verantwortlich f\u00fcr die Datenverarbeitung auf dieser Website ist die
            LeadSolution GmbH, Musterstra\u00dfe 1, 12345 Musterstadt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            2. Erhebung und Speicherung personenbezogener Daten
          </h2>
          <p>
            Wir erheben personenbezogene Daten, wenn Sie uns diese im Rahmen
            einer Registrierung, Kontaktaufnahme oder Nutzung unserer Dienste
            freiwillig mitteilen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            3. Nutzung von Cookies
          </h2>
          <p>
            Unsere Website verwendet Cookies, um die Nutzung unserer Dienste zu
            erm\u00f6glichen und zu verbessern. Sie k\u00f6nnen die Speicherung von Cookies
            in Ihren Browsereinstellungen verhindern.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            4. Ihre Rechte
          </h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, L\u00f6schung und
            Einschr\u00e4nkung der Verarbeitung Ihrer personenbezogenen Daten.
            Kontaktieren Sie uns unter info@leadsolution.de.
          </p>
        </section>

        <p className="text-sm text-gray-500">
          Diese Datenschutzerkl\u00e4rung ist ein Platzhalter und muss vor der
          Ver\u00f6ffentlichung durch eine rechtlich gepr\u00fcfte Version ersetzt werden.
        </p>
      </div>
    </article>
  )
}
