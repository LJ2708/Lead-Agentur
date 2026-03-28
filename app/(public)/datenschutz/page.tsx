import Link from "next/link"

export const metadata = {
  title: "Datenschutzerklärung | LeadSolution",
}

export default function DatenschutzPage() {
  return (
    <article className="space-y-8">
      <Link
        href="/"
        className="inline-block text-sm text-gray-400 transition-colors hover:text-white"
      >
        &larr; Zurück zur Startseite
      </Link>

      <h1 className="text-3xl font-bold text-white">
        Datenschutzerklärung
      </h1>

      <div className="space-y-6 text-gray-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            1. Verantwortlicher
          </h2>
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Website ist die
            LeadSolution GmbH, Musterstraße 1, 12345 Musterstadt.
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
            ermöglichen und zu verbessern. Sie können die Speicherung von Cookies
            in Ihren Browsereinstellungen verhindern.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            4. Ihre Rechte
          </h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
            Einschränkung der Verarbeitung Ihrer personenbezogenen Daten.
            Kontaktieren Sie uns unter info@leadsolution.de.
          </p>
        </section>

        <p className="text-sm text-gray-500">
          Diese Datenschutzerklärung ist ein Platzhalter und muss vor der
          Veröffentlichung durch eine rechtlich geprüfte Version ersetzt werden.
        </p>
      </div>
    </article>
  )
}
