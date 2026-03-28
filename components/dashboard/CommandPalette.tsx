"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  Search,
  FileText,
  UserCheck,
  LayoutDashboard,
  Zap,
  Clock,
  ArrowRight,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string
  type: "lead" | "berater" | "seite" | "aktion"
  label: string
  sublabel?: string
  href: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Static pages & actions
// ---------------------------------------------------------------------------

const PAGES: SearchResult[] = [
  { id: "p-admin", type: "seite", label: "Admin Overview", href: "/admin" },
  { id: "p-leads", type: "seite", label: "Leads", href: "/admin/leads" },
  { id: "p-berater", type: "seite", label: "Berater", href: "/admin/berater" },
  { id: "p-pricing", type: "seite", label: "Pricing", href: "/admin/pricing" },
  { id: "p-budget", type: "seite", label: "Budget", href: "/admin/budget" },
  { id: "p-routing", type: "seite", label: "Routing", href: "/admin/routing" },
  { id: "p-reports", type: "seite", label: "Reports", href: "/admin/reports" },
  { id: "p-analytics", type: "seite", label: "Analytics", href: "/admin/analytics" },
  { id: "p-performance", type: "seite", label: "Performance", href: "/admin/performance" },
  { id: "p-audit", type: "seite", label: "Audit Log", href: "/admin/audit" },
  { id: "p-nachkauf", type: "seite", label: "Nachkauf", href: "/admin/nachkauf" },
  { id: "p-setter", type: "seite", label: "Setter", href: "/admin/setter" },
  { id: "p-berater-overview", type: "seite", label: "Berater Overview", href: "/berater" },
  { id: "p-berater-leads", type: "seite", label: "Meine Leads", href: "/berater/leads" },
  { id: "p-kalender", type: "seite", label: "Kalender", href: "/berater/kalender" },
]

const ACTIONS: SearchResult[] = [
  { id: "a-new-lead", type: "aktion", label: "Neuer Lead erstellen", href: "/admin/leads/neu" },
  { id: "a-invite", type: "aktion", label: "Berater einladen", href: "/admin/berater?invite=true" },
  { id: "a-export", type: "aktion", label: "Leads exportieren", href: "/api/leads/export" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RECENT_KEY = "command-palette-recent"
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return
  const recent = getRecentSearches().filter((r) => r !== query)
  recent.unshift(query)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

const typeIcon: Record<string, typeof FileText> = {
  lead: FileText,
  berater: UserCheck,
  seite: LayoutDashboard,
  aktion: Zap,
}

const typeLabel: Record<string, string> = {
  lead: "Leads",
  berater: "Berater",
  seite: "Seiten",
  aktion: "Aktionen",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches when opened
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setQuery("")
      setResults([])
      setActiveIndex(0)
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  const performSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim().toLowerCase()
      if (!trimmed) {
        setResults([])
        setLoading(false)
        return
      }

      setLoading(true)

      // Filter static pages + actions
      const matchedPages = PAGES.filter(
        (p) => p.label.toLowerCase().includes(trimmed)
      ).slice(0, 5)

      const matchedActions = ACTIONS.filter(
        (a) => a.label.toLowerCase().includes(trimmed)
      ).slice(0, 5)

      // Search leads + berater from Supabase
      const supabase = createClient()

      const [leadsRes, beraterRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, vorname, nachname, email, telefon")
          .or(
            `vorname.ilike.%${trimmed}%,nachname.ilike.%${trimmed}%,email.ilike.%${trimmed}%,telefon.ilike.%${trimmed}%`
          )
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("berater")
          .select("id, profiles:profile_id(full_name, email)")
          .or(
            `profiles.full_name.ilike.%${trimmed}%,profiles.email.ilike.%${trimmed}%`
          )
          .limit(5),
      ])

      const leadResults: SearchResult[] = (leadsRes.data ?? []).map((l) => ({
        id: `lead-${l.id}`,
        type: "lead" as const,
        label: [l.vorname, l.nachname].filter(Boolean).join(" ") || "Unbenannt",
        sublabel: l.email ?? l.telefon ?? undefined,
        href: `/admin/leads`,
      }))

      type BeraterRow = {
        id: string
        profiles: { full_name: string; email: string } | null
      }
      const beraterResults: SearchResult[] = (
        (beraterRes.data ?? []) as unknown as BeraterRow[]
      ).map((b) => ({
        id: `berater-${b.id}`,
        type: "berater" as const,
        label: b.profiles?.full_name ?? "Unbekannt",
        sublabel: b.profiles?.email ?? undefined,
        href: `/admin/berater/${b.id}`,
      }))

      setResults([...leadResults, ...beraterResults, ...matchedPages, ...matchedActions])
      setActiveIndex(0)
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, performSearch])

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  const flatResults = results

  function navigate(result: SearchResult) {
    saveRecentSearch(query)
    onOpenChange(false)
    router.push(result.href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (flatResults[activeIndex]) {
        navigate(flatResults[activeIndex])
      }
    }
  }

  const showEmpty = !query.trim() && !loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Suche</DialogTitle>

        {/* Search input */}
        <div className="flex items-center border-b px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen... (Leads, Berater, Seiten)"
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Suche...
            </div>
          )}

          {!loading && query.trim() && flatResults.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Keine Ergebnisse gefunden.
            </div>
          )}

          {!loading &&
            query.trim() &&
            flatResults.length > 0 &&
            (["lead", "berater", "seite", "aktion"] as const).map((type) => {
              const items = grouped[type]
              if (!items || items.length === 0) return null
              const Icon = typeIcon[type]
              return (
                <div key={type} className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {typeLabel[type]}
                  </div>
                  {items.map((item) => {
                    const idx = flatResults.indexOf(item)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                          idx === activeIndex
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent/50"
                        )}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigate(item)}
                      >
                        <span className="flex-1">
                          <span className="font-medium">{item.label}</span>
                          {item.sublabel && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {item.sublabel}
                            </span>
                          )}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )
                  })}
                </div>
              )
            })}

          {/* Empty state: recent searches and quick actions */}
          {showEmpty && (
            <div className="space-y-4">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Letzte Suchen
                  </div>
                  {recentSearches.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50"
                      onClick={() => setQuery(s)}
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" />
                  Schnellaktionen
                </div>
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50"
                    onClick={() => navigate(a)}
                  >
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1">{a.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Seiten
                </div>
                {PAGES.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50"
                    onClick={() => navigate(p)}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1">{p.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              &uarr;&darr;
            </kbd>
            <span>Navigieren</span>
            <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              &crarr;
            </kbd>
            <span>Auswählen</span>
          </div>
          <div>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            <span className="ml-1">Schließen</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
