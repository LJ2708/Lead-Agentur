"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceCount {
  source: string
  label: string
  count: number
}

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: "Meta Lead Ad",
  landingpage: "Landingpage",
  manuell: "Manuell",
  import: "Import",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadMapPlaceholder() {
  const [sources, setSources] = useState<SourceCount[]>([])

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchSources() {
      const { data: leads } = await supabase
        .from("leads")
        .select("source")

      const allLeads = leads ?? []
      const counts: Record<string, number> = {}
      for (const l of allLeads) {
        const src = l.source ?? "manuell"
        counts[src] = (counts[src] ?? 0) + 1
      }

      const result: SourceCount[] = Object.entries(counts)
        .map(([source, count]) => ({
          source,
          label: SOURCE_LABELS[source] ?? source,
          count,
        }))
        .sort((a, b) => b.count - a.count)

      setSources(result)
    }
    fetchSources()
  }, [supabase])

  const maxCount = sources.length > 0 ? Math.max(...sources.map((s) => s.count)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Lead-Verteilung
        </CardTitle>
        <CardDescription>
          Geografische Lead-Verteilung &mdash; Coming Soon
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Placeholder Germany outline */}
        <div className="relative mx-auto flex h-48 w-full max-w-xs items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/30">
          <div className="text-center">
            <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground/60">
              Kartenansicht
            </p>
            <p className="text-xs text-muted-foreground/40">
              In Entwicklung
            </p>
          </div>
        </div>

        {/* Lead count by source bars */}
        {sources.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Leads nach Quelle
            </p>
            {sources.map((s) => {
              const widthPct = maxCount > 0 ? Math.max(4, (s.count / maxCount) * 100) : 4

              return (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-right text-xs text-muted-foreground">
                    {s.label}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded-sm bg-blue-500/80 transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium">
                    {s.count}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
