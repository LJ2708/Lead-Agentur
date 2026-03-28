import type { Metadata, Viewport } from "next"
import { Outfit, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "LeadSolution \u2014 Lead-Management & Vertriebsplattform",
    template: "%s | LeadSolution",
  },
  description:
    "Qualifizierte Leads aus Meta-Kampagnen \u2014 automatisch verteilt, mit SLA-Garantie und KI-Priorisierung. Ab 39\u20AC pro Lead.",
  keywords: [
    "Lead Management",
    "Vertrieb",
    "Finanzberater",
    "Leads kaufen",
    "Meta Ads Leads",
    "SaaS",
  ],
  authors: [{ name: "LeadSolution" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LeadSolution",
  },
  other: {
    "apple-touch-icon": "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "https://leadsolution.de",
    siteName: "LeadSolution",
    title: "LeadSolution \u2014 Qualifizierte Leads f\u00FCr Ihren Vertrieb",
    description:
      "Leads aus Meta-Kampagnen, automatisch verteilt. Ab 39\u20AC/Lead.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadSolution",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadSolution \u2014 Lead-Management Platform",
    description:
      "Qualifizierte Leads ab 39\u20AC. Automatische Verteilung mit SLA-Garantie.",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2563EB",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={cn("font-sans antialiased", outfit.variable, jetbrainsMono.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
