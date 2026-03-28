import Link from "next/link"
import {
  Zap,
  MessageCircle,
  Headphones,
  LayoutDashboard,
  Shield,
  Lock,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Settings,
  Inbox,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import PricingConfigurator from "@/components/marketing/PricingConfigurator"

/* ------------------------------------------------------------------ */
/*  NAV                                                                */
/* ------------------------------------------------------------------ */
function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#222226] bg-[#08080A]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6] text-white font-bold text-sm">
            LS
          </div>
          <span className="text-lg font-bold text-[#FAFAFA]">LeadSolution</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#funktionen" className="text-sm font-medium text-[#FAFAFA]/60 transition-colors hover:text-[#FAFAFA]">
            Funktionen
          </a>
          <a href="#pakete" className="text-sm font-medium text-[#FAFAFA]/60 transition-colors hover:text-[#FAFAFA]">
            Pakete
          </a>
          <a href="#so-funktionierts" className="text-sm font-medium text-[#FAFAFA]/60 transition-colors hover:text-[#FAFAFA]">
            So funktioniert&apos;s
          </a>
        </nav>

        <Button
          variant="outline"
          asChild
          className="border-[#222226] bg-transparent text-[#FAFAFA] hover:bg-[#17171B] hover:text-[#FAFAFA]"
        >
          <Link href="/login">Dashboard</Link>
        </Button>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  HERO                                                               */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative bg-[#08080A] pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#3B82F6]/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#8B5CF6]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center rounded-full border border-[#222226] bg-[#17171B] px-4 py-1.5 text-sm text-[#FAFAFA]/80">
              <span className="mr-2">&#x1F680;</span>
              Jetzt Leads sichern &mdash; ab 39&euro; pro Lead
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#FAFAFA] sm:text-5xl lg:text-6xl">
              Qualifizierte Leads.
              <br />
              <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
                Automatisch geliefert.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-[#FAFAFA]/60 sm:text-xl max-w-xl">
              LeadSolution liefert dir exklusive Leads aus Meta-Kampagnen &mdash; gleichm&auml;&szlig;ig verteilt, mit SLA-Garantie und KI-Priorisierung.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                asChild
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 h-12 text-base font-semibold"
              >
                <Link href="/register">Jetzt starten</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-[#222226] bg-transparent text-[#FAFAFA] hover:bg-[#17171B] hover:text-[#FAFAFA] h-12 text-base"
              >
                <a href="#so-funktionierts">So funktioniert&apos;s</a>
              </Button>
            </div>

            {/* Stats row */}
            <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-[#FAFAFA]/60">
              <span className="font-semibold text-[#FAFAFA]">ab 39&euro;/Lead</span>
              <span className="hidden sm:inline text-[#222226]">|</span>
              <span className="font-semibold text-[#FAFAFA]">100% exklusiv</span>
              <span className="hidden sm:inline text-[#222226]">|</span>
              <span className="font-semibold text-[#FAFAFA]">&lt;5 Min Reaktionszeit</span>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-[#222226] bg-[#17171B] p-6 shadow-2xl shadow-[#3B82F6]/5">
              {/* Top bar */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#EF4444]/60" />
                <div className="h-3 w-3 rounded-full bg-[#F59E0B]/60" />
                <div className="h-3 w-3 rounded-full bg-[#10B981]/60" />
                <div className="ml-4 h-4 w-48 rounded bg-[#222226]" />
              </div>
              {/* Stat cards */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Neue Leads", value: "24", color: "bg-[#3B82F6]/10 text-[#3B82F6]" },
                  { label: "Termine", value: "12", color: "bg-[#10B981]/10 text-[#10B981]" },
                  { label: "Abschl\u00fcsse", value: "6", color: "bg-[#8B5CF6]/10 text-[#8B5CF6]" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
                    <div className="text-xs font-medium opacity-80">{s.label}</div>
                    <div className="text-2xl font-bold">{s.value}</div>
                  </div>
                ))}
              </div>
              {/* Fake chart bar */}
              <div className="mb-4 rounded-lg bg-[#08080A] p-4">
                <div className="flex items-end gap-1.5 h-16">
                  {[40, 65, 50, 80, 60, 90, 75, 85, 70, 95, 80, 60].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-[#3B82F6]/40"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              {/* Fake list */}
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-[#08080A] p-3">
                    <div className="h-8 w-8 rounded-full bg-[#3B82F6]/20" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-32 rounded bg-[#222226]" />
                      <div className="h-2 w-20 rounded bg-[#222226]/60" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[10px] text-[#10B981] font-medium">
                      Neu
                    </div>
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
/*  TRUST BAR                                                          */
/* ------------------------------------------------------------------ */
function TrustBar() {
  const channels = [
    { name: "Meta Ads", icon: "M" },
    { name: "Instagram", icon: "I" },
    { name: "Facebook", icon: "F" },
    { name: "Landingpages", icon: "L" },
    { name: "WhatsApp", icon: "W" },
  ]

  return (
    <section className="border-y border-[#222226] bg-[#08080A] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <p className="text-sm text-[#FAFAFA]/40 font-medium shrink-0">
            Leads aus allen Kan&auml;len:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {channels.map((ch) => (
              <div
                key={ch.name}
                className="inline-flex items-center gap-2 rounded-full border border-[#222226] bg-[#17171B] px-4 py-1.5 text-xs font-medium text-[#FAFAFA]/50"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#222226] text-[10px] font-bold text-[#FAFAFA]/60">
                  {ch.icon}
                </span>
                {ch.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  STEPS                                                              */
/* ------------------------------------------------------------------ */
function StepsSection() {
  const steps = [
    {
      num: "01",
      icon: Settings,
      title: "Paket konfigurieren",
      description: "W\u00e4hle deine Lead-Anzahl und starte dein Abo in 2 Minuten.",
    },
    {
      num: "02",
      icon: Inbox,
      title: "Leads empfangen",
      description: "Qualifizierte Leads landen automatisch in deinem Dashboard \u2014 gleichm\u00e4\u00dfig \u00fcber den Monat.",
    },
    {
      num: "03",
      icon: TrendingUp,
      title: "Abschl\u00fcsse erzielen",
      description: "Kontaktiere deine Leads, verfolge deinen Fortschritt und steigere deinen Umsatz.",
    },
  ]

  return (
    <section id="so-funktionierts" className="bg-[#FAFBFC] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#111113] sm:text-4xl">
            So funktioniert&apos;s
          </h2>
          <p className="mt-4 text-lg text-[#111113]/60">
            In drei einfachen Schritten zu mehr Abschl&uuml;ssen.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.num} className="relative text-center group">
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="absolute top-10 left-[calc(50%+3rem)] hidden h-px w-[calc(100%-6rem)] bg-[#E4E4E7] sm:block" />
              )}
              {/* Number badge */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#E4E4E7] bg-white shadow-sm transition-all group-hover:border-[#3B82F6]/30 group-hover:shadow-md">
                <div className="text-center">
                  <span className="block text-xs font-bold text-[#3B82F6]">{step.num}</span>
                  <step.icon className="mt-1 h-6 w-6 text-[#111113]/60 mx-auto" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#111113]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#111113]/60 max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  FEATURES                                                           */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: Zap,
    title: "Pacing-Verteilung",
    description: "Leads werden gleichm\u00e4\u00dfig \u00fcber den Monat verteilt. Kein Feast-or-Famine.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & E-Mail",
    description: "Automatische Benachrichtigungen an Leads und Berater \u00fcber alle Kan\u00e4le.",
  },
  {
    icon: Headphones,
    title: "Setter-Service",
    description: "Optionaler Setter kontaktiert deine Leads vorab \u2014 max. 5 Versuche pro Lead.",
  },
  {
    icon: LayoutDashboard,
    title: "Smart Dashboard",
    description: "KI-gest\u00fctztes Dashboard mit Lead-Scoring, SLA-Timer und Quick Actions.",
  },
  {
    icon: Shield,
    title: "100% Exklusiv",
    description: "Jeder Lead geh\u00f6rt nur dir. Keine Mehrfachvergabe, keine Konkurrenz.",
  },
  {
    icon: Lock,
    title: "DSGVO-konform",
    description: "Alle Daten in Frankfurt (EU), vollst\u00e4ndig DSGVO-konform.",
  },
]

function FeaturesSection() {
  return (
    <section id="funktionen" className="bg-[#08080A] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#FAFAFA] sm:text-4xl">
            Alles was dein Vertrieb braucht
          </h2>
          <p className="mt-4 text-lg text-[#FAFAFA]/60">
            Von der Lead-Erfassung bis zum Abschluss &mdash; LeadSolution automatisiert deinen gesamten Vertriebsprozess.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-[#222226] bg-[#17171B] p-6 transition-all hover:border-[#3B82F6]/50"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] transition-colors group-hover:bg-[#3B82F6]/20">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#FAFAFA]/50">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  PRICING                                                            */
/* ------------------------------------------------------------------ */
function PricingSection() {
  const checks = [
    "Exklusive Leads",
    "SLA-Garantie",
    "KI-Dashboard",
    "WhatsApp-Integration",
  ]

  return (
    <section id="pakete" className="bg-[#FAFBFC] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#111113] sm:text-4xl">
            Transparente Preise
          </h2>
          <p className="mt-4 text-lg text-[#111113]/60">
            W&auml;hle deine Lead-Anzahl &mdash; je mehr, desto g&uuml;nstiger.
          </p>
        </div>

        <PricingConfigurator />

        {/* Feature checks */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {checks.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-[#111113]/60">
              <CheckCircle className="h-4 w-4 text-[#10B981]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
const faqItems = [
  {
    question: "Was ist LeadSolution?",
    answer:
      "LeadSolution ist eine Plattform, die dir exklusive, qualifizierte Leads aus Meta-Kampagnen liefert. Wir \u00fcbernehmen die gesamte Lead-Generierung, Verteilung und Nachverfolgung \u2014 du konzentrierst dich auf den Abschluss.",
  },
  {
    question: "Wie funktioniert die Lead-Verteilung?",
    answer:
      "Unsere Pacing-Engine verteilt deine Leads gleichm\u00e4\u00dfig \u00fcber den Monat. So vermeidest du \u00dcberlastung am Monatsanfang und Leerlauf am Ende. Du bekommst jeden Tag die optimale Anzahl an Leads.",
  },
  {
    question: "Was kostet ein Lead?",
    answer:
      "Der Preis pro Lead sinkt mit der Anzahl: von 59\u20AC bei 10 Leads bis 39\u20AC bei 50 Leads pro Monat. Nutze den Preiskonfigurator oben, um deinen individuellen Preis zu berechnen.",
  },
  {
    question: "Was ist der Setter-Service?",
    answer:
      "Ein Setter kontaktiert deine Leads vorab per Telefon und WhatsApp \u2014 maximal 5 Versuche pro Lead. So erh\u00e4ltst du bereits vorqualifizierte Kontakte und sparst wertvolle Zeit.",
  },
  {
    question: "Wie schnell bekomme ich Leads?",
    answer:
      "Nach der Aktivierung deines Abos beginnt die Lead-Lieferung innerhalb von 24 Stunden. Die Leads werden dann gleichm\u00e4\u00dfig \u00fcber den restlichen Monat verteilt.",
  },
  {
    question: "Kann ich mein Abo \u00e4ndern?",
    answer:
      "Du kannst die Lead-Anzahl jederzeit zum n\u00e4chsten Monat anpassen. Eine K\u00fcndigung ist nach Ablauf der Mindestlaufzeit von 3 Monaten monatlich m\u00f6glich.",
  },
  {
    question: "Sind die Leads exklusiv?",
    answer:
      "Ja, jeder Lead wird ausschlie\u00dflich an dich geliefert. Es gibt keine Mehrfachvergabe und keine Konkurrenz um denselben Kontakt. Dein Lead geh\u00f6rt nur dir.",
  },
]

function FaqSection() {
  return (
    <section className="bg-[#FAFBFC] py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#111113] sm:text-4xl">
            H&auml;ufig gestellte Fragen
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-[#E4E4E7] bg-white"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[#111113] font-medium hover:text-[#3B82F6] transition-colors [&::-webkit-details-marker]:hidden list-none">
                {item.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-[#111113]/40 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-6 pb-4 text-sm leading-relaxed text-[#111113]/60">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  CTA                                                                */
/* ------------------------------------------------------------------ */
function CtaSection() {
  return (
    <section className="relative bg-[#08080A] py-24 sm:py-32 overflow-hidden">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-[#3B82F6]/10 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-[#FAFAFA] sm:text-4xl lg:text-5xl">
          Bereit f&uuml;r deine ersten Leads?
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[#FAFAFA]/60">
          Starte jetzt und erhalte qualifizierte Leads ab 39&euro; &mdash; gleichm&auml;&szlig;ig &uuml;ber den Monat verteilt.
        </p>
        <div className="mt-10">
          <Button
            size="lg"
            asChild
            className="bg-white text-[#08080A] hover:bg-[#FAFAFA] px-10 h-12 text-base font-semibold"
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
/*  FOOTER                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-[#222226] bg-[#08080A] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6] text-white font-bold text-sm">
              LS
            </div>
            <span className="text-lg font-bold text-[#FAFAFA]">LeadSolution</span>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm text-[#FAFAFA]/40">
            <Link href="/impressum" className="transition-colors hover:text-[#FAFAFA]">
              Impressum
            </Link>
            <Link href="/datenschutz" className="transition-colors hover:text-[#FAFAFA]">
              Datenschutz
            </Link>
            <Link href="/agb" className="transition-colors hover:text-[#FAFAFA]">
              AGB
            </Link>
            <Link href="/login" className="transition-colors hover:text-[#FAFAFA]">
              Dashboard Login
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-[#222226] pt-6 text-center text-sm text-[#FAFAFA]/30">
          &copy; 2026 LeadSolution. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN LANDING PAGE                                                  */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08080A] scroll-smooth">
      <Navbar />
      <main>
        <HeroSection />
        <TrustBar />
        <StepsSection />
        <FeaturesSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
