"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { calcGesamtpreis } from "@/lib/pricing/calculator"

const LEAD_MARKS = [10, 15, 20, 25, 30, 40, 50]

export default function PricingConfigurator() {
  const [leads, setLeads] = useState(20)
  const [hatSetter, setHatSetter] = useState(false)

  const pricing = useMemo(() => calcGesamtpreis(leads, hatSetter), [leads, hatSetter])

  const preisProLead = (pricing.preisProLead / 100).toFixed(0)
  const monatspreis = (pricing.monatspreis / 100).toFixed(0)
  const ersparnis = (pricing.ersparnis / 100).toFixed(0)
  const setterAufpreis = (pricing.setterProLead / 100).toFixed(0)
  const totalMitSetter = ((pricing.monatspreis) / 100).toFixed(0)

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Left: Configurator */}
      <div className="lg:col-span-3 space-y-8">
        {/* Slider */}
        <div>
          <label className="block text-sm font-medium text-[#111113] mb-4">
            Anzahl Leads pro Monat: <span className="text-[#3B82F6] font-bold">{pricing.leads}</span>
          </label>
          <Slider
            value={[leads]}
            onValueChange={(v) => setLeads(v[0])}
            min={10}
            max={50}
            step={5}
            className="w-full"
          />
          {/* Marks */}
          <div className="flex justify-between mt-3">
            {LEAD_MARKS.map((mark) => (
              <button
                key={mark}
                type="button"
                onClick={() => setLeads(mark)}
                className={`text-xs font-medium transition-colors ${
                  mark === leads
                    ? "text-[#3B82F6]"
                    : "text-[#111113]/40 hover:text-[#111113]/70"
                }`}
              >
                {mark}
              </button>
            ))}
          </div>
        </div>

        {/* Setter Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-white p-4">
          <div>
            <p className="text-sm font-medium text-[#111113]">Setter-Service hinzuf&uuml;gen</p>
            <p className="text-xs text-[#111113]/50 mt-0.5">+10&euro;/Lead &mdash; ein Setter kontaktiert deine Leads vorab</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hatSetter}
            onClick={() => setHatSetter(!hatSetter)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 ${
              hatSetter ? "bg-[#3B82F6]" : "bg-[#E4E4E7]"
            }`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                hatSetter ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Enterprise banner */}
        {pricing.isEnterprise && (
          <div className="rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/5 p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#8B5CF6] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#111113]">Mehr als 50 Leads?</p>
              <p className="text-xs text-[#111113]/60 mt-0.5">
                Kontaktiere uns f&uuml;r ein individuelles Angebot mit Sonderkonditionen.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Price Card */}
      <div className="lg:col-span-2">
        <div className="sticky top-28 rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-xl shadow-black/5">
          <p className="text-sm font-medium text-[#111113]/60">{pricing.leads} Leads/Monat</p>

          {/* Price */}
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-[#111113] font-mono">{preisProLead}&euro;</span>
              <span className="text-sm text-[#111113]/50">pro Lead</span>
            </div>
            <p className="text-sm text-[#111113]/60 mt-2">
              Gesamt: <span className="font-semibold text-[#111113]">{monatspreis}&euro;</span>/Monat
            </p>
            {hatSetter && (
              <p className="text-sm text-[#111113]/60 mt-1">
                +{setterAufpreis}&euro; Setter/Lead = <span className="font-semibold text-[#111113]">{totalMitSetter}&euro;</span>/Monat
              </p>
            )}
          </div>

          {/* Savings */}
          {pricing.ersparnis > 0 && (
            <div className="mt-4 rounded-lg bg-[#10B981]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#10B981]">
                Du sparst {ersparnis}&euro; vs. Einzelpreis
              </p>
            </div>
          )}

          {/* Mindestlaufzeit */}
          <p className="text-xs text-[#111113]/40 mt-4">
            Mindestlaufzeit: {pricing.mindestlaufzeit} Monate
          </p>

          {/* CTA */}
          <Button
            asChild
            className="w-full mt-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white h-12 text-base font-semibold"
          >
            <Link href="/register">
              Jetzt starten
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
