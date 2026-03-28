import Link from "next/link"
import {
  Zap,
  Timer,
  Brain,
  Inbox,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  ArrowRight,
  Clock,
  BarChart3,
  Star,
  Quote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"

/* ------------------------------------------------------------------ */
/*  Pricing helper                                                     */
/* ------------------------------------------------------------------ */
function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
            LS
          </div>
          <span className="text-xl font-bold text-gray-900">LeadSolution</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#funktionen"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
          >
            Funktionen
          </a>
          <a
            href="#pakete"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
          >
            Pakete
          </a>
          <a
            href="#so-funktionierts"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
          >
            So funktioniert&apos;s
          </a>
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="bg-primary-600 hover:bg-primary-700">
            <Link href="/register">Jetzt starten</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — copy */}
          <div className="max-w-2xl">
            <Badge
              variant="secondary"
              className="mb-6 border-primary-200 bg-primary-50 text-primary-700"
            >
              <Zap className="mr-1 h-3 w-3" />
              Jetzt neu: KI Lead-Scoring
            </Badge>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Mehr Leads.{" "}
              <span className="text-primary-600">Weniger Aufwand.</span>{" "}
              Maximaler Vertriebserfolg.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl">
              LeadSolution liefert Ihnen qualifizierte Leads aus
              Meta-Kampagnen&nbsp;&mdash; automatisch verteilt, mit SLA-Garantie
              und KI-gest&uuml;tzter Priorisierung.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                asChild
                className="bg-primary-600 px-8 hover:bg-primary-700"
              >
                <Link href="/register">
                  Jetzt starten
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#so-funktionierts">Demo ansehen</a>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-primary-600" />
                30-Minuten SLA
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Brain className="h-4 w-4 text-primary-600" />
                KI-gest&uuml;tzte Verteilung
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="h-4 w-4 text-primary-600" />
                Echtzeit-Dashboard
              </div>
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
              {/* Fake top bar */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <div className="ml-4 h-4 w-48 rounded bg-gray-100" />
              </div>
              {/* Fake stat cards */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Neue Leads", value: "24", color: "bg-primary-100 text-primary-700" },
                  { label: "Termine", value: "12", color: "bg-green-100 text-green-700" },
                  { label: "Abschl\u00fcsse", value: "6", color: "bg-amber-100 text-amber-700" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-lg p-3 ${s.color}`}
                  >
                    <div className="text-xs font-medium opacity-80">
                      {s.label}
                    </div>
                    <div className="text-2xl font-bold">{s.value}</div>
                  </div>
                ))}
              </div>
              {/* Fake list */}
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary-200" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-32 rounded bg-gray-200" />
                      <div className="h-2 w-20 rounded bg-gray-100" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-primary-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Logo / Trust Bar                                                   */
/* ------------------------------------------------------------------ */
function TrustBar() {
  return (
    <section className="border-y bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="mb-8 text-sm font-medium uppercase tracking-wider text-gray-500">
          Vertraut von 50+ Finanzberatern
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {["Partner A", "Partner B", "Partner C", "Partner D", "Partner E"].map(
            (name) => (
              <div
                key={name}
                className="flex h-10 items-center rounded bg-gray-200/60 px-6 text-sm font-semibold text-gray-400"
              >
                {name}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: Zap,
    title: "Automatische Lead-Verteilung",
    description:
      "Leads werden per Pacing-Algorithmus gleichm\u00e4\u00dfig \u00fcber den Monat verteilt.",
  },
  {
    icon: Timer,
    title: "30-Min SLA-Garantie",
    description:
      "Jeder Lead wird innerhalb von 30 Minuten kontaktiert \u2014 oder automatisch umverteilt.",
  },
  {
    icon: Brain,
    title: "KI Lead-Scoring",
    description:
      "Jeder Lead wird automatisch bewertet und priorisiert. Ihre Berater wissen sofort, wen sie zuerst anrufen sollen.",
  },
  {
    icon: Inbox,
    title: "Smart Inbox",
    description:
      "Action-First Dashboard: Keine Administration, nur die n\u00e4chste Aktion. Anrufen, Status \u00e4ndern, Termin buchen \u2014 in 1 Klick.",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description:
      "Echtzeit-Leaderboard, pers\u00f6nlicher Score, und KI-Tipps zur Verbesserung.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & E-Mail",
    description:
      "Automatische Benachrichtigungen an Leads und Berater \u00fcber alle Kan\u00e4le.",
  },
]

function FeaturesSection() {
  return (
    <section id="funktionen" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Alles was Ihr Vertrieb braucht
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Von der Lead-Erfassung bis zum Abschluss &mdash; LeadSolution
            automatisiert Ihren gesamten Vertriebsprozess.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group border-gray-200 transition-all hover:border-primary-200 hover:shadow-lg"
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                  <f.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-gray-600">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  How it Works                                                       */
/* ------------------------------------------------------------------ */
const steps = [
  {
    title: "Paket w\u00e4hlen",
    description:
      "W\u00e4hlen Sie ein Lead-Paket mit fester monatlicher St\u00fcckzahl.",
  },
  {
    title: "Leads empfangen",
    description:
      "Qualifizierte Leads aus Meta-Kampagnen landen automatisch in Ihrem Dashboard.",
  },
  {
    title: "Leads kontaktieren",
    description:
      "Kontaktieren Sie Leads innerhalb der SLA-Zeit. Das System unterst\u00fctzt Sie mit KI-Priorisierung.",
  },
  {
    title: "Abschl\u00fcsse erzielen",
    description:
      "Verfolgen Sie Ihren Fortschritt, optimieren Sie Ihre Performance und steigern Sie Ihren Umsatz.",
  },
]

function HowItWorksSection() {
  return (
    <section id="so-funktionierts" className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            So funktioniert&apos;s
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            In vier einfachen Schritten zu mehr Abschl&uuml;ssen.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative text-center">
              {/* Connector line (hidden on first card & mobile) */}
              {i > 0 && (
                <div className="absolute -left-4 top-8 hidden h-0.5 w-8 bg-primary-200 lg:block" />
              )}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-200">
                <span className="text-xl font-bold">{i + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */
async function PricingSection() {
  let pakete: {
    id: string
    name: string
    beschreibung: string | null
    leads_pro_monat: number
    preis_pro_lead_cents: number
    gesamtpreis_cents: number
    mindestlaufzeit_monate: number
    setter_aufpreis_cents: number
    is_active: boolean
    sort_order: number
  }[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("lead_pakete")
      .select(
        "id, name, beschreibung, leads_pro_monat, preis_pro_lead_cents, gesamtpreis_cents, mindestlaufzeit_monate, setter_aufpreis_cents, is_active, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order")

    if (data) pakete = data
  } catch {
    // Supabase unavailable — show fallback
  }

  // Fallback data when DB is empty / unavailable
  if (pakete.length === 0) {
    pakete = [
      {
        id: "1",
        name: "Starter",
        beschreibung: "Ideal zum Einstieg",
        leads_pro_monat: 15,
        preis_pro_lead_cents: 4500,
        gesamtpreis_cents: 67500,
        mindestlaufzeit_monate: 3,
        setter_aufpreis_cents: 1000,
        is_active: true,
        sort_order: 1,
      },
      {
        id: "2",
        name: "Standard",
        beschreibung: "Unser beliebtestes Paket",
        leads_pro_monat: 30,
        preis_pro_lead_cents: 4000,
        gesamtpreis_cents: 120000,
        mindestlaufzeit_monate: 3,
        setter_aufpreis_cents: 1000,
        is_active: true,
        sort_order: 2,
      },
      {
        id: "3",
        name: "Premium",
        beschreibung: "F\u00fcr ambitionierte Berater",
        leads_pro_monat: 50,
        preis_pro_lead_cents: 3500,
        gesamtpreis_cents: 175000,
        mindestlaufzeit_monate: 3,
        setter_aufpreis_cents: 1000,
        is_active: true,
        sort_order: 3,
      },
    ]
  }

  return (
    <section id="pakete" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Transparente Preise
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            W&auml;hlen Sie das Paket, das zu Ihrem Vertrieb passt.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {pakete.map((p, i) => {
            const isPopular = i === 1 || p.name.toLowerCase() === "standard"
            return (
              <Card
                key={p.id}
                className={`relative flex flex-col transition-all hover:shadow-lg ${
                  isPopular
                    ? "border-2 border-primary-600 shadow-lg"
                    : "border-gray-200"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary-600 text-white hover:bg-primary-600">
                      <Star className="mr-1 h-3 w-3" /> Beliebt
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  {p.beschreibung && (
                    <p className="text-sm text-gray-500">{p.beschreibung}</p>
                  )}
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatEuro(p.gesamtpreis_cents)}
                      </span>
                      <span className="text-sm text-gray-500">/Monat</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatEuro(p.preis_pro_lead_cents)} pro Lead &middot;{" "}
                      {p.leads_pro_monat} Leads/Monat
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="mb-8 flex-1 space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      {p.leads_pro_monat} qualifizierte Leads / Monat
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      30-Minuten SLA-Garantie
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      KI Lead-Scoring &amp; Priorisierung
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      Echtzeit-Dashboard
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      WhatsApp &amp; E-Mail Benachrichtigungen
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      {p.mindestlaufzeit_monate} Monate Mindestlaufzeit
                    </li>
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild
                    className={`w-full ${
                      isPopular
                        ? "bg-primary-600 hover:bg-primary-700"
                        : ""
                    }`}
                    variant={isPopular ? "default" : "outline"}
                  >
                    <Link href="/register">
                      Jetzt starten
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Alle Pakete: 3 Monate Mindestlaufzeit. Setter-Addon: +10&nbsp;&euro;
          pro Lead.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
const testimonials = [
  {
    name: "Max M.",
    role: "Finanzberater",
    quote:
      "Seit ich LeadSolution nutze, habe ich 40% mehr Termine pro Monat.",
  },
  {
    name: "Sarah K.",
    role: "Maklerin",
    quote:
      "Die automatische Verteilung spart mir Stunden an Admin-Arbeit.",
  },
  {
    name: "Thomas W.",
    role: "Vertriebspartner",
    quote:
      "Das SLA-System sorgt daf\u00fcr, dass kein Lead verloren geht.",
  },
]

function TestimonialsSection() {
  return (
    <section className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Das sagen unsere Kunden
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-gray-200">
              <CardContent className="pt-6">
                <Quote className="mb-4 h-8 w-8 text-primary-200" />
                <p className="text-gray-700 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */
function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-primary-600 py-24 sm:py-32">
      {/* Decorative blobs */}
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary-500 opacity-30 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary-700 opacity-30 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Bereit f&uuml;r mehr Leads?
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-primary-100">
          Starten Sie jetzt und erhalten Sie Ihre ersten Leads innerhalb von
          24&nbsp;Stunden.
        </p>
        <div className="mt-10">
          <Button
            size="lg"
            asChild
            className="bg-white px-10 text-primary-700 hover:bg-primary-50"
          >
            <Link href="/register">
              Kostenlos registrieren
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
              LS
            </div>
            <span className="text-lg font-bold text-gray-900">
              LeadSolution
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <a href="#" className="transition-colors hover:text-gray-900">
              Impressum
            </a>
            <a href="#" className="transition-colors hover:text-gray-900">
              Datenschutz
            </a>
            <a href="#" className="transition-colors hover:text-gray-900">
              AGB
            </a>
            <a
              href="mailto:info@leadsolution.de"
              className="transition-colors hover:text-gray-900"
            >
              info@leadsolution.de
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-gray-400">
          &copy; 2026 LeadSolution. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */
export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <Navbar />
      <main>
        <HeroSection />
        <TrustBar />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
