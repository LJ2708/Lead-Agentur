import Link from "next/link"
import {
  Zap,
  MessageCircle,
  Headphones,
  LayoutDashboard,
  Shield,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Settings,
  Inbox,
  TrendingUp,
  Star,
  Users,
  Clock,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import PartnerPricingConfigurator from "@/components/marketing/PartnerPricingConfigurator"

/* ------------------------------------------------------------------ */
/*  NAV                                                                */
/* ------------------------------------------------------------------ */
function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#222226] bg-[#08080A]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#FAFAFA]/40 tracking-wide uppercase">
            LeadSolution
          </span>
          <span className="text-[#FAFAFA]/20">x</span>
          <span className="text-sm font-bold text-[#FAFAFA] tracking-wide uppercase">
            Value Factory
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#vorteile" className="text-sm font-medium text-[#FAFAFA]/60 transition-colors hover:text-[#FAFAFA]">
            Vorteile
          </a>
          <a href="#angebot" className="text-sm font-medium text-[#FAFAFA]/60 transition-colors hover:text-[#FAFAFA]">
            Sonderangebot
          </a>
          <a href="#so-gehts" className="text-sm font-medium text-[#FAFAFA]/60 transition-colors hover:text-[#FAFAFA]">
            So geht&apos;s
          </a>
          <a href="#faq" className="text-sm font-medium text-[#FAFAFA]/60 transition-colors hover:text-[#FAFAFA]">
            FAQ
          </a>
        </nav>

        <Button
          size="sm"
          asChild
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold"
        >
          <a href="#angebot">Jetzt sichern</a>
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
      <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-[#10B981]/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left */}
          <div className="max-w-2xl">
            {/* Partner Badge */}
            <div className="mb-4 inline-flex items-center rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-[#10B981]">
              <Star className="mr-2 h-4 w-4" />
              Exklusiv f&uuml;r Value Factory Berater
            </div>

            {/* Urgency Badge */}
            <div className="mb-8 inline-flex ml-2 items-center rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-1.5 text-sm font-medium text-[#F59E0B]">
              <Clock className="mr-2 h-4 w-4" />
              Begrenzte Pl&auml;tze
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#FAFAFA] sm:text-5xl lg:text-6xl">
              Dein unfairer
              <br />
              <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
                Vertriebsvorteil.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-[#FAFAFA]/60 sm:text-xl max-w-xl">
              Als Value Factory Berater bekommst du exklusive Leads aus Meta-Kampagnen &mdash;
              mit KI-Dashboard, SLA-Garantie und{" "}
              <span className="text-[#10B981] font-semibold">Sonderkonditionen</span>,
              die sonst niemand bekommt.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                asChild
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 h-12 text-base font-semibold"
              >
                <a href="#angebot">
                  Sonderangebot ansehen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-[#222226] bg-transparent text-[#FAFAFA] hover:bg-[#17171B] hover:text-[#FAFAFA] h-12 text-base"
              >
                <a href="#so-gehts">So funktioniert&apos;s</a>
              </Button>
            </div>

            {/* Stats row */}
            <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-[#FAFAFA]/60">
              <span className="font-semibold text-[#10B981]">Sonderpreis ab 39&euro;/Lead</span>
              <span className="hidden sm:inline text-[#222226]">|</span>
              <span className="font-semibold text-[#FAFAFA]">100% exklusiv</span>
              <span className="hidden sm:inline text-[#222226]">|</span>
              <span className="font-semibold text-[#FAFAFA]">KI-Dashboard inklusive</span>
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
              {/* Smart Inbox Preview */}
              <div className="mb-4 rounded-lg bg-[#08080A] p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Inbox className="h-4 w-4 text-[#3B82F6]" />
                  <span className="text-xs font-semibold text-[#FAFAFA]/60">Smart Inbox</span>
                  <span className="ml-auto rounded-full bg-[#EF4444]/20 px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">3 SLA</span>
                </div>
                {/* Fake lead rows */}
                {[
                  { name: "Max M.", score: 82, badge: "Hot", badgeColor: "bg-[#EF4444]/10 text-[#EF4444]" },
                  { name: "Sarah K.", score: 67, badge: "Warm", badgeColor: "bg-[#F59E0B]/10 text-[#F59E0B]" },
                  { name: "Tim B.", score: 54, badge: "Neu", badgeColor: "bg-[#10B981]/10 text-[#10B981]" },
                ].map((lead) => (
                  <div key={lead.name} className="flex items-center gap-3 rounded-lg bg-[#17171B] p-2.5 mb-1.5">
                    <div className="h-8 w-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-xs font-bold text-[#3B82F6]">
                      {lead.score}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-[#FAFAFA]/80">{lead.name}</div>
                      <div className="text-[10px] text-[#FAFAFA]/30">Meta Ad &middot; Termin</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${lead.badgeColor}`}>
                      {lead.badge}
                    </span>
                  </div>
                ))}
              </div>
              {/* AI Action Banner */}
              <div className="rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 p-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-[#8B5CF6] shrink-0" />
                <span className="text-[11px] text-[#FAFAFA]/60">
                  <span className="font-medium text-[#8B5CF6]">KI-Empfehlung:</span> Max M. jetzt anrufen &mdash; h&ouml;chste Abschluss-Wahrscheinlichkeit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  PARTNER TRUST BAR                                                  */
/* ------------------------------------------------------------------ */
function PartnerTrustBar() {
  return (
    <section className="border-y border-[#222226] bg-[#08080A] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              "Exklusiv f\u00fcr Value Factory",
              "Sonderkonditionen",
              "Keine Mehrfachvergabe",
              "SLA-Garantie",
              "KI-Priorisierung",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-[#FAFAFA]/60">
                <CheckCircle className="h-4 w-4 text-[#10B981]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  WHY THIS DEAL                                                      */
/* ------------------------------------------------------------------ */
function WhySection() {
  const reasons = [
    {
      icon: Target,
      title: "Exklusive Leads f\u00fcr dich",
      description: "Jeder Lead geh\u00f6rt nur dir. Keine Mehrfachvergabe, keine Konkurrenz mit anderen Beratern. Dein Lead = Dein Abschluss.",
    },
    {
      icon: LayoutDashboard,
      title: "KI-Smart Dashboard",
      description: "Unser KI-System bewertet jeden Lead automatisch, zeigt dir die n\u00e4chste beste Aktion und priorisiert nach Abschluss-Wahrscheinlichkeit.",
    },
    {
      icon: Zap,
      title: "Pacing-Verteilung",
      description: "Leads werden gleichm\u00e4\u00dfig \u00fcber den Monat verteilt. Kein Feast-or-Famine \u2014 jeden Tag die optimale Anzahl an Leads.",
    },
    {
      icon: Shield,
      title: "SLA-Garantie",
      description: "30-Minuten SLA-Timer mit automatischer Erinnerung. So verpasst du keinen Lead und deine Conversion steigt.",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp & E-Mail Automation",
      description: "Automatische Benachrichtigungen an dich und deine Leads. Multi-Channel-Kontakt f\u00fcr maximale Erreichbarkeit.",
    },
    {
      icon: Headphones,
      title: "Setter-Service (optional)",
      description: "Ein Setter kontaktiert deine Leads vorab \u2014 max. 5 Versuche pro Lead. Du bekommst nur vorqualifizierte Termine.",
    },
  ]

  return (
    <section id="vorteile" className="bg-[#08080A] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="mb-4 inline-flex items-center rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-4 py-1.5 text-sm font-medium text-[#3B82F6]">
            <Users className="mr-2 h-4 w-4" />
            Nur f&uuml;r Value Factory Berater
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#FAFAFA] sm:text-4xl">
            Warum Berater auf LeadSolution schwören
          </h2>
          <p className="mt-4 text-lg text-[#FAFAFA]/60">
            Alles was du brauchst, um planbar mehr Termine und Abschl&uuml;sse zu generieren.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <div
              key={r.title}
              className="group rounded-xl border border-[#222226] bg-[#17171B] p-6 transition-all hover:border-[#3B82F6]/50"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] transition-colors group-hover:bg-[#3B82F6]/20">
                <r.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA]">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#FAFAFA]/50">
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  PRICING SECTION                                                    */
/* ------------------------------------------------------------------ */
function PricingSection() {
  const checks = [
    "Exklusive Leads",
    "SLA-Garantie",
    "KI-Dashboard",
    "WhatsApp-Integration",
    "Pacing-Verteilung",
    "DSGVO-konform",
  ]

  return (
    <section id="angebot" className="bg-[#FAFBFC] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="mb-4 inline-flex items-center rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-[#10B981]">
            <Star className="mr-2 h-4 w-4" />
            Value Factory Sonderangebot
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#111113] sm:text-4xl">
            Dein exklusiver Sonderpreis
          </h2>
          <p className="mt-4 text-lg text-[#111113]/60">
            Als Value Factory Partner bekommst du Konditionen, die auf der normalen Seite nicht verf&uuml;gbar sind.
          </p>
        </div>

        <PartnerPricingConfigurator />

        {/* Feature checks */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
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
/*  STEPS                                                              */
/* ------------------------------------------------------------------ */
function StepsSection() {
  const steps = [
    {
      num: "01",
      icon: Settings,
      title: "Paket w\u00e4hlen",
      description: "W\u00e4hle deine gew\u00fcnschte Lead-Anzahl und ob du den Setter-Service m\u00f6chtest.",
    },
    {
      num: "02",
      icon: Inbox,
      title: "Direkt bezahlen & starten",
      description: "Sichere dir dein Paket per Kreditkarte oder SEPA \u2014 in unter 2 Minuten erledigt.",
    },
    {
      num: "03",
      icon: TrendingUp,
      title: "Leads erhalten & abschlie\u00dfen",
      description: "Innerhalb von 24h landen die ersten Leads in deinem KI-Dashboard. Kontaktiere sie und mach Abschl\u00fcsse.",
    },
  ]

  return (
    <section id="so-gehts" className="bg-[#FAFBFC] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#111113] sm:text-4xl">
            In 3 Schritten startklar
          </h2>
          <p className="mt-4 text-lg text-[#111113]/60">
            Kein Papierkram. Kein langes Warten. Einfach loslegen.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.num} className="relative text-center group">
              {i < steps.length - 1 && (
                <div className="absolute top-10 left-[calc(50%+3rem)] hidden h-px w-[calc(100%-6rem)] bg-[#E4E4E7] sm:block" />
              )}
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
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
const faqItems = [
  {
    question: "Was ist das Value Factory Sonderangebot?",
    answer:
      "Als Value Factory Berater bekommst du exklusive Sonderkonditionen auf LeadSolution \u2014 g\u00fcnstigere Lead-Preise als auf der normalen Seite. Das Angebot ist nur \u00fcber diesen Link verf\u00fcgbar und zeitlich begrenzt.",
  },
  {
    question: "Was bekomme ich genau?",
    answer:
      "Du bekommst exklusive, qualifizierte Leads aus Meta-Kampagnen direkt in dein KI-Smart Dashboard. Jeder Lead geh\u00f6rt nur dir (keine Mehrfachvergabe). Dazu: SLA-Garantie, automatische Benachrichtigungen, Lead-Scoring und optional einen Setter-Service.",
  },
  {
    question: "Wie schnell bekomme ich die ersten Leads?",
    answer:
      "Nach der Bezahlung wird dein Account innerhalb von 24 Stunden aktiviert. Die Leads werden dann gleichm\u00e4\u00dfig \u00fcber den Monat verteilt \u2014 kein Feast-or-Famine.",
  },
  {
    question: "Was ist der Setter-Service?",
    answer:
      "Optional kannst du einen Setter dazubuchen (+10\u20AC/Lead). Der Setter kontaktiert deine Leads vorab per Telefon und WhatsApp (max. 5 Versuche) und liefert dir vorqualifizierte Termine.",
  },
  {
    question: "Wie funktioniert die Bezahlung?",
    answer:
      "Du bezahlst bequem per Kreditkarte oder SEPA-Lastschrift \u00fcber Stripe. Das Abo wird monatlich abgerechnet. Keine versteckten Kosten.",
  },
  {
    question: "Wie lang ist die Mindestlaufzeit?",
    answer:
      "Die Mindestlaufzeit betr\u00e4gt 3 Monate. Danach ist das Abo monatlich k\u00fcndbar. Du kannst dein Lead-Kontingent jederzeit anpassen.",
  },
  {
    question: "Kann ich sp\u00e4ter mehr Leads dazubuchen?",
    answer:
      "Ja, du kannst dein Kontingent jederzeit erh\u00f6hen oder einzelne Lead-Pakete nachkaufen. Alles direkt \u00fcber dein Dashboard.",
  },
]

function FaqSection() {
  return (
    <section id="faq" className="bg-[#FAFBFC] py-24 sm:py-32">
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
        <div className="mb-6 inline-flex items-center rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-1.5 text-sm font-medium text-[#F59E0B]">
          <Clock className="mr-2 h-4 w-4" />
          Begrenzte Pl&auml;tze &mdash; nur f&uuml;r Value Factory Berater
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-[#FAFAFA] sm:text-4xl lg:text-5xl">
          Sichere dir jetzt deinen
          <br />
          <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
            Vertriebsvorteil
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[#FAFAFA]/60">
          Exklusive Leads ab 39&euro;/Lead, KI-Dashboard, SLA-Garantie &mdash;
          alles in einem Paket, nur f&uuml;r dich als Value Factory Berater.
        </p>
        <div className="mt-10">
          <Button
            size="lg"
            asChild
            className="bg-white text-[#08080A] hover:bg-[#FAFAFA] px-10 h-12 text-base font-semibold"
          >
            <a href="#angebot">
              Sonderangebot sichern
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#FAFAFA]/30 tracking-wide uppercase">
              LeadSolution
            </span>
            <span className="text-[#FAFAFA]/15">x</span>
            <span className="text-sm font-bold text-[#FAFAFA]/50 tracking-wide uppercase">
              Value Factory
            </span>
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
/*  MAIN                                                               */
/* ------------------------------------------------------------------ */
export default function ValueFactoryLandingPage() {
  return (
    <div className="min-h-screen bg-[#08080A] scroll-smooth">
      <Navbar />
      <main>
        <HeroSection />
        <PartnerTrustBar />
        <WhySection />
        <PricingSection />
        <StepsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
