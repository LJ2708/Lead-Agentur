"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { formatEuro } from "@/lib/utils"
import { ShoppingCart, ArrowRight, Loader2 } from "lucide-react"

interface BeraterInfo {
  id: string
  preis_pro_lead_cents: number
}

const NACHKAUF_PAKETE = [
  { anzahl: 5, label: "5er-Pack" },
  { anzahl: 10, label: "10er-Pack" },
]

export default function BeraterNachkaufPage() {
  const supabase = createClient()

  const [berater, setBerater] = useState<BeraterInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [purchasingId, setPurchasingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: beraterData } = await supabase
      .from("berater")
      .select("id, preis_pro_lead_cents")
      .eq("profile_id", user.id)
      .single()

    if (beraterData) {
      setBerater(beraterData)
    }

    setIsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleKauf(anzahl: number) {
    if (!berater) return

    setPurchasingId(anzahl)
    setError(null)

    try {
      const res = await fetch("/api/stripe/nachkauf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berater_id: berater.id,
          anzahl_leads: anzahl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Fehler beim Erstellen der Checkout-Session")
        setPurchasingId(null)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        setError("Keine Checkout-URL erhalten")
        setPurchasingId(null)
      }
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.")
      setPurchasingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!berater) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Leads nachkaufen</h1>
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-muted-foreground">
              Kein Berater-Profil gefunden. Bitte schlie\u00dfen Sie zuerst das Onboarding ab.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const preisProLead = berater.preis_pro_lead_cents

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads nachkaufen</h1>
        <p className="text-muted-foreground">
          Erweitern Sie Ihr Kontingent mit zus\u00e4tzlichen Leads zum aktuellen
          Preis von {formatEuro(preisProLead)} pro Lead.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {NACHKAUF_PAKETE.map((paket) => {
          const gesamtpreis = preisProLead * paket.anzahl
          const isPurchasing = purchasingId === paket.anzahl

          return (
            <Card key={paket.anzahl} className="relative overflow-hidden">
              {paket.anzahl === 10 && (
                <Badge className="absolute right-4 top-4 bg-green-100 text-green-800 hover:bg-green-100">
                  Beliebt
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  {paket.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {formatEuro(gesamtpreis)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{paket.anzahl} Leads enthalten</p>
                    <p>{formatEuro(preisProLead)} pro Lead</p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={isPurchasing || purchasingId !== null}
                  onClick={() => handleKauf(paket.anzahl)}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird weitergeleitet...
                    </>
                  ) : (
                    <>
                      Kaufen
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
