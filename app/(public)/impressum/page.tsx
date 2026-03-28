import Link from "next/link"

export const metadata = {
  title: "Impressum | LeadSolution",
}

export default function ImpressumPage() {
  return (
    <article className="space-y-8">
      <Link
        href="/"
        className="inline-block text-sm text-gray-400 transition-colors hover:text-white"
      >
        &larr; Zur\u00fcck zur Startseite
      </Link>

      <h1 className="text-3xl font-bold text-white">Impressum</h1>

      <div className="space-y-4 text-gray-300 leading-relaxed">
        <p>
          <strong className="text-white">LeadSolution GmbH</strong>
          <br />
          Musterstra\u00dfe 1
          <br />
          12345 Musterstadt
          <br />
          Deutschland
        </p>

        <p>
          <strong className="text-white">Vertreten durch:</strong>
          <br />
          Max Mustermann, Gesch\u00e4ftsf\u00fchrer
        </p>

        <p>
          <strong className="text-white">Kontakt:</strong>
          <br />
          E-Mail: info@leadsolution.de
          <br />
          Telefon: +49 (0) 123 456789
        </p>

        <p>
          <strong className="text-white">Registereintrag:</strong>
          <br />
          Handelsregister: Amtsgericht Musterstadt
          <br />
          Registernummer: HRB 12345
        </p>

        <p>
          <strong className="text-white">Umsatzsteuer-ID:</strong>
          <br />
          DE123456789
        </p>

        <p className="text-sm text-gray-500">
          Diese Seite enth\u00e4lt Platzhalterangaben und muss vor der
          Ver\u00f6ffentlichung mit den tats\u00e4chlichen Unternehmensdaten aktualisiert
          werden.
        </p>
      </div>
    </article>
  )
}
