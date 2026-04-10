import type { Metadata } from "next"
import ValueFactoryLandingPage from "@/components/landing/ValueFactoryLandingPage"

export const metadata: Metadata = {
  title: "Value Factory x LeadSolution | Exklusives Sonderangebot",
  description:
    "Exklusive Leads mit KI-Dashboard, SLA-Garantie und Sonderkonditionen \u2014 nur f\u00fcr Value Factory Berater.",
}

export default function ValueFactoryPage() {
  return <ValueFactoryLandingPage />
}
