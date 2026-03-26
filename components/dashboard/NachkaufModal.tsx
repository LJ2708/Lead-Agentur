"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Loader2, Check } from "lucide-react";
import { formatEuro, cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type NachkaufPaket = Tables<"nachkauf_pakete">;

interface NachkaufModalProps {
  pakete: NachkaufPaket[];
  beraterId: string;
  open: boolean;
  onClose: () => void;
}

export function NachkaufModal({
  pakete,
  beraterId,
  open,
  onClose,
}: NachkaufModalProps) {
  const [selectedPaketId, setSelectedPaketId] = useState<string | null>(null);
  const [mitSetter, setMitSetter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedPaket = pakete.find((p) => p.id === selectedPaketId) ?? null;

  const setterGesamtpreis = selectedPaket
    ? selectedPaket.anzahl_leads * selectedPaket.setter_aufpreis_cents
    : 0;
  const gesamtpreis = selectedPaket
    ? selectedPaket.gesamtpreis_cents + (mitSetter ? setterGesamtpreis : 0)
    : 0;

  async function handleKaufen() {
    if (!selectedPaket) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/nachkauf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paketId: selectedPaket.id,
          beraterId,
          mitSetter,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Error handling silently
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leads nachkaufen</DialogTitle>
          <DialogDescription>
            Waehlen Sie ein Paket und buchen Sie zusaetzliche Leads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {pakete.map((paket) => (
            <button
              key={paket.id}
              type="button"
              onClick={() => setSelectedPaketId(paket.id)}
              className={cn(
                "w-full rounded-lg border p-4 text-left transition-colors",
                selectedPaketId === paket.id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{paket.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {paket.anzahl_leads} Leads
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatEuro(paket.gesamtpreis_cents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEuro(paket.preis_pro_lead_cents)} / Lead
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedPaket && (
          <>
            <Separator />

            {/* Setter Addon */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <input
                type="checkbox"
                checked={mitSetter}
                onChange={(e) => setMitSetter(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Setter hinzufuegen</p>
                <p className="text-xs text-muted-foreground">
                  + {formatEuro(selectedPaket.setter_aufpreis_cents)} pro Lead Setter-Service
                </p>
              </div>
              {mitSetter && (
                <span className="text-sm font-medium">
                  + {formatEuro(setterGesamtpreis)}
                </span>
              )}
            </label>

            <Separator />

            {/* Price Summary */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selectedPaket.name}
                </span>
                <span>{formatEuro(selectedPaket.gesamtpreis_cents)}</span>
              </div>
              {mitSetter && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setter-Service</span>
                  <span>{formatEuro(setterGesamtpreis)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Gesamt</span>
                <span>{formatEuro(gesamtpreis)}</span>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button
            onClick={handleKaufen}
            disabled={!selectedPaket || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
            ) : (
              <ShoppingCart className="h-4 w-4" data-icon="inline-start" />
            )}
            {isLoading ? "Wird verarbeitet..." : "Jetzt kaufen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
