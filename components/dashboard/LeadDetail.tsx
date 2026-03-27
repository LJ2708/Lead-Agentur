"use client";

import {
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LeadActivityTimeline } from "@/components/dashboard/LeadActivityTimeline";
import { formatDate, getStatusColor, getStatusLabel, cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads">;
type Activity = Tables<"lead_activities"> & {
  created_by_name?: string | null;
};

interface LeadDetailProps {
  lead: Lead;
  activities: Activity[];
  onStatusChange?: (newStatus: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddNote?: (note: string) => void;
}

export function LeadDetail({
  lead,
  activities,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStatusChange: _onStatusChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddNote: _onAddNote,
}: LeadDetailProps) {
  const fullName = `${lead.vorname} ${lead.nachname}`;

  return (
    <div className="space-y-6">
      {/* Lead Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{fullName}</CardTitle>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                getStatusColor(lead.status)
              )}
            >
              {getStatusLabel(lead.status)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Info */}
          <div className="grid gap-3 sm:grid-cols-2">
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${lead.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {lead.email}
                </a>
              </div>
            )}
            {lead.telefon && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${lead.telefon}`}
                  className="text-blue-600 hover:underline"
                >
                  {lead.telefon}
                </a>
              </div>
            )}
          </div>

          <Separator />

          {/* Meta Info */}
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Quelle:</span>{" "}
              <span className="font-medium">{lead.source}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Erstellt am:</span>{" "}
              <span className="font-medium">{formatDate(lead.created_at)}</span>
            </div>
            {lead.zugewiesen_am && (
              <div>
                <span className="text-muted-foreground">Zugewiesen am:</span>{" "}
                <span className="font-medium">
                  {formatDate(lead.zugewiesen_am)}
                </span>
              </div>
            )}
            {lead.erster_kontakt_am && (
              <div>
                <span className="text-muted-foreground">Erster Kontakt:</span>{" "}
                <span className="font-medium">
                  {formatDate(lead.erster_kontakt_am)}
                </span>
              </div>
            )}
            {lead.naechste_erinnerung && (
              <div>
                <span className="text-muted-foreground">Nächste Erinnerung:</span>{" "}
                <span className="font-medium">{formatDate(lead.naechste_erinnerung)}</span>
              </div>
            )}
            {lead.kontaktversuche > 0 && (
              <div>
                <span className="text-muted-foreground">Kontaktversuche:</span>{" "}
                <span className="font-medium">{lead.kontaktversuche}</span>
              </div>
            )}
          </div>

          {/* UTM / Campaign */}
          {(lead.utm_source || lead.utm_campaign) && (
            <>
              <Separator />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-muted-foreground">
                  Kampagnen-Daten
                </p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {lead.utm_source && (
                    <div>
                      <span className="text-muted-foreground">Source:</span>{" "}
                      {lead.utm_source}
                    </div>
                  )}
                  {lead.utm_medium && (
                    <div>
                      <span className="text-muted-foreground">Medium:</span>{" "}
                      {lead.utm_medium}
                    </div>
                  )}
                  {lead.utm_campaign && (
                    <div>
                      <span className="text-muted-foreground">Kampagne:</span>{" "}
                      {lead.utm_campaign}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Contact Actions */}
          <Separator />
          <div className="flex flex-wrap gap-2">
            {lead.telefon && (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${lead.telefon}`}>
                  <Phone className="h-3.5 w-3.5" data-icon="inline-start" />
                  Anrufen
                </a>
              </Button>
            )}
            {lead.email && (
              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${lead.email}`}>
                  <Mail className="h-3.5 w-3.5" data-icon="inline-start" />
                  E-Mail senden
                </a>
              </Button>
            )}
            {lead.telefon && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://wa.me/${lead.telefon.replace(/[^0-9+]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-3.5 w-3.5" data-icon="inline-start" />
                  WhatsApp senden
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitaeten</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadActivityTimeline activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}
