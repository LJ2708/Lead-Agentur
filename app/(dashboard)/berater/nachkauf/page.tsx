"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NachkaufModal } from "@/components/dashboard/NachkaufModal";
import { formatEuro } from "@/lib/utils";
import { ShoppingCart, Package, ArrowRight } from "lucide-react";
import type { Tables } from "@/types/database";

type NachkaufPaket = Tables<"nachkauf_pakete">;

export default function BeraterNachkaufPage() {
  const supabase = createClient();

  const [pakete, setPakete] = useState<NachkaufPaket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [beraterId, setBeraterId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);



  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get berater record
    const { data: berater } = await supabase
      .from("berater")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (berater) {
      setBeraterId(berater.id);
    }

    // Fetch active nachkauf pakete
    const { data: paketeData } = await supabase
      .from("nachkauf_pakete")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    setPakete(paketeData ?? []);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDirectKauf(paketId: string) {
    try {
      const res = await fetch("/api/stripe/nachkauf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paketId,
          beraterId,
          mitSetter: false,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Silently handle error
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Leads nachkaufen
          </h1>
          <p className="text-muted-foreground">
            Erweitern Sie Ihr Kontingent mit zusätzlichen Leads
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <ShoppingCart className="h-4 w-4" data-icon="inline-start" />
          Paket wählen
        </Button>
      </div>

      {pakete.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Derzeit sind keine Nachkauf-Pakete verfügbar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pakete.map((paket) => (
            <Card key={paket.id} className="relative overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">{paket.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {formatEuro(paket.gesamtpreis_cents)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{paket.anzahl_leads} Leads enthalten</p>
                    <p>{formatEuro(paket.preis_pro_lead_cents)} pro Lead</p>
                  </div>
                </div>

                {paket.name && (
                  <p className="text-sm text-muted-foreground">
                    {paket.name}
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={() => handleDirectKauf(paket.id)}
                >
                  Kaufen
                  <ArrowRight className="h-4 w-4" data-icon="inline-end" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal for detailed purchase */}
      <NachkaufModal
        pakete={pakete}
        beraterId={beraterId}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
