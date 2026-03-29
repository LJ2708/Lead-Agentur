"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Globe,
  FileText,
  GitBranch,
  CreditCard,
  Gauge,
  ChevronDown,
  Lock,
  Unlock,
  Copy,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  requestBody?: string;
  response?: string;
}

interface ApiCategory {
  title: string;
  icon: LucideIcon;
  endpoints: ApiEndpoint[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const API_CATEGORIES: ApiCategory[] = [
  {
    title: "Webhooks",
    icon: Globe,
    endpoints: [
      {
        method: "POST",
        path: "/api/webhooks/meta",
        description:
          "Empfängt Lead-Daten von Meta Lead Ads. Wird automatisch von Meta aufgerufen, wenn ein neuer Lead generiert wird.",
        auth: false,
        requestBody: `{
  "entry": [{
    "changes": [{
      "value": {
        "leadgen_id": "string",
        "form_id": "string",
        "field_data": [
          { "name": "email", "values": ["..."] },
          { "name": "phone_number", "values": ["..."] }
        ]
      }
    }]
  }]
}`,
        response: `{ "success": true }`,
      },
      {
        method: "POST",
        path: "/api/webhooks/landingpage",
        description:
          "Empfängt Lead-Daten von der Landingpage. Erfordert x-api-key Header zur Authentifizierung.",
        auth: true,
        requestBody: `{
  "vorname": "string",
  "nachname": "string",
  "email": "string",
  "telefon": "string",
  "utm_source": "string?",
  "utm_medium": "string?",
  "utm_campaign": "string?",
  "custom_fields": {}
}`,
        response: `{ "success": true, "lead_id": "uuid" }`,
      },
    ],
  },
  {
    title: "Leads",
    icon: FileText,
    endpoints: [
      {
        method: "GET",
        path: "/api/leads",
        description:
          "Liste aller Leads mit Paginierung und Filteroptionen. Unterstützt Query-Parameter für Status, Berater, Datum und Suche.",
        auth: true,
        response: `{
  "data": [Lead],
  "total": number,
  "page": number,
  "per_page": number
}`,
      },
      {
        method: "PATCH",
        path: "/api/leads/[id]",
        description:
          "Aktualisiert den Status oder andere Felder eines Leads.",
        auth: true,
        requestBody: `{
  "status": "lead_status?",
  "berater_id": "uuid?",
  "contact_outcome": "string?"
}`,
        response: `{ "success": true, "lead": Lead }`,
      },
      {
        method: "POST",
        path: "/api/leads/[id]/accept",
        description:
          "Berater akzeptiert die Lead-Zuweisung. Setzt accepted_at und startet SLA-Timer.",
        auth: true,
        response: `{ "success": true }`,
      },
      {
        method: "POST",
        path: "/api/leads/[id]/reject",
        description:
          "Berater lehnt einen Lead ab. Lead wird zur Neuzuweisung freigegeben.",
        auth: true,
        requestBody: `{ "reason": "string?" }`,
        response: `{ "success": true }`,
      },
      {
        method: "POST",
        path: "/api/leads/[id]/outcome",
        description:
          "Protokolliert das Ergebnis eines Kontaktversuchs (erreicht, nicht_erreicht, mailbox, etc.).",
        auth: true,
        requestBody: `{
  "outcome": "string",
  "notes": "string?",
  "callback_at": "datetime?"
}`,
        response: `{ "success": true }`,
      },
      {
        method: "POST",
        path: "/api/leads/[id]/assign",
        description:
          "Manuelle Zuweisung eines Leads an einen bestimmten Berater durch Admin.",
        auth: true,
        requestBody: `{
  "berater_id": "uuid",
  "reason": "string?"
}`,
        response: `{ "success": true }`,
      },
      {
        method: "POST",
        path: "/api/leads/import",
        description:
          "Importiert Leads aus einer CSV-Datei. Erwartet multipart/form-data mit CSV-Upload.",
        auth: true,
        requestBody: `FormData: { file: CSV }`,
        response: `{
  "imported": number,
  "skipped": number,
  "errors": string[]
}`,
      },
      {
        method: "GET",
        path: "/api/leads/export",
        description:
          "Exportiert Leads als CSV-Datei. Unterstützt die gleichen Filter wie GET /api/leads.",
        auth: true,
        response: `text/csv`,
      },
    ],
  },
  {
    title: "Routing",
    icon: GitBranch,
    endpoints: [
      {
        method: "POST",
        path: "/api/routing/distribute",
        description:
          "Löst die Lead-Verteilung aus. Verteilt Leads in der Warteschlange an verfügbare Berater basierend auf Pacing und Verfügbarkeit.",
        auth: true,
        response: `{
  "distributed": number,
  "remaining": number
}`,
      },
    ],
  },
  {
    title: "Stripe",
    icon: CreditCard,
    endpoints: [
      {
        method: "POST",
        path: "/api/stripe/checkout",
        description:
          "Erstellt eine Stripe Checkout Session für ein Abonnement. Leitet den Berater zur Zahlung weiter.",
        auth: true,
        requestBody: `{
  "paket_id": "uuid",
  "hat_setter": boolean
}`,
        response: `{ "url": "https://checkout.stripe.com/..." }`,
      },
      {
        method: "POST",
        path: "/api/stripe/nachkauf",
        description:
          "Erstellt eine einmalige Kaufsession für zusätzliche Leads (Nachkauf).",
        auth: true,
        requestBody: `{
  "nachkauf_paket_id": "uuid",
  "hat_setter": boolean
}`,
        response: `{ "url": "https://checkout.stripe.com/..." }`,
      },
      {
        method: "POST",
        path: "/api/stripe/webhook",
        description:
          "Stripe Webhook Handler. Verarbeitet checkout.session.completed, invoice.paid, customer.subscription.updated, etc.",
        auth: false,
        response: `{ "received": true }`,
      },
    ],
  },
  {
    title: "Sonstiges",
    icon: Gauge,
    endpoints: [
      {
        method: "GET",
        path: "/api/pricing/calculate",
        description:
          "Berechnet den Preis für ein bestimmtes Lead-Paket mit optionalem Setter-Aufpreis.",
        auth: false,
        response: `{
  "preis_pro_lead_cents": number,
  "gesamtpreis_cents": number,
  "setter_aufpreis_cents": number
}`,
      },
      {
        method: "GET",
        path: "/api/stats",
        description:
          "Liefert aggregierte Dashboard-Statistiken (Leads heute, offene Leads, SLA-Rate, etc.).",
        auth: true,
        response: `{
  "leads_heute": number,
  "offene_leads": number,
  "sla_rate": number,
  "conversion_rate": number
}`,
      },
      {
        method: "POST",
        path: "/api/berater/invite",
        description:
          "Sendet eine Einladung an einen neuen Berater per E-Mail.",
        auth: true,
        requestBody: `{
  "email": "string",
  "full_name": "string"
}`,
        response: `{ "success": true }`,
      },
      {
        method: "POST",
        path: "/api/notifications/send",
        description:
          "Sendet eine Benachrichtigung an einen bestimmten Benutzer.",
        auth: true,
        requestBody: `{
  "user_id": "uuid",
  "type": "string",
  "title": "string",
  "body": "string?",
  "urgency": "low|medium|high"
}`,
        response: `{ "success": true, "notification_id": "uuid" }`,
      },
      {
        method: "POST",
        path: "/api/seed",
        description:
          "Befüllt die Datenbank mit Testdaten. Nur in der Entwicklungsumgebung verfügbar.",
        auth: true,
        response: `{ "success": true, "created": { ... } }`,
      },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-700 border-green-200",
  POST: "bg-blue-100 text-blue-700 border-blue-200",
  PATCH: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Kopiert
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Kopieren
            </>
          )}
        </button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 font-mono text-xs",
            METHOD_COLORS[endpoint.method]
          )}
        >
          {endpoint.method}
        </Badge>
        <code className="flex-1 text-sm font-medium">{endpoint.path}</code>
        <div className="flex items-center gap-2">
          {endpoint.auth ? (
            <Lock className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <Unlock className="h-3.5 w-3.5 text-green-500" />
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            {endpoint.description}
          </p>
          <div className="flex items-center gap-2 text-xs">
            {endpoint.auth ? (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700"
              >
                <Lock className="mr-1 h-3 w-3" />
                Authentifizierung erforderlich
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700"
              >
                <Unlock className="mr-1 h-3 w-3" />
                Öffentlich
              </Badge>
            )}
          </div>
          {endpoint.requestBody && (
            <CodeBlock code={endpoint.requestBody} label="Request Body" />
          )}
          {endpoint.response && (
            <CodeBlock code={endpoint.response} label="Response" />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API-Dokumentation"
        description="Übersicht aller internen API-Endpunkte"
      />

      <div className="space-y-8">
        {API_CATEGORIES.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <Card key={category.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CategoryIcon className="h-5 w-5" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.endpoints.map((endpoint) => (
                  <EndpointCard
                    key={`${endpoint.method}-${endpoint.path}`}
                    endpoint={endpoint}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* General Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Allgemeine Hinweise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Authentifizierung:</strong> Die meisten Endpunkte erfordern
            eine gültige Supabase-Session. Der Auth-Token wird automatisch über
            Cookies übermittelt.
          </p>
          <p>
            <strong>Webhook-Endpunkte:</strong> Webhooks von externen Diensten
            (Meta, Stripe) verwenden eigene Verifizierungsmechanismen
            (Signaturen bzw. API-Keys).
          </p>
          <p>
            <strong>Fehlerformat:</strong> Alle Endpunkte geben bei Fehlern ein
            JSON-Objekt zurück:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {"{ \"error\": \"Fehlerbeschreibung\" }"}
            </code>
          </p>
          <p>
            <strong>Rate Limiting:</strong> API-Aufrufe sind auf 100 Anfragen
            pro Minute pro Benutzer begrenzt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
