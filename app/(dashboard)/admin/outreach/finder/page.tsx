"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ExternalLink,
  Link2,
  Globe,
  MapPin,
  UserPlus,
  ChevronDown,
  ChevronLeft,
  Lightbulb,
  Clock,
  Trash2,
  UserCheck,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchCriteria {
  position: string;
  city: string;
  keywords: string;
  experience: string;
}

interface SavedSearch {
  criteria: SearchCriteria;
  savedAt: string;
  label: string;
}

interface QuickAddForm {
  linkedinUrl: string;
  fullName: string;
  company: string;
  position: string;
  city: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSITION_SUGGESTIONS = [
  "Finanzberater",
  "Versicherungsmakler",
  "Vermögensberater",
  "Finanzplaner",
  "Versicherungsvermittler",
  "Bausparkassenvertreter",
  "Bankberater",
  "Immobilienfinanzierungsberater",
];

const EXPERIENCE_OPTIONS = [
  { value: "alle", label: "Alle" },
  { value: "1-5", label: "1-5 Jahre" },
  { value: "5-10", label: "5-10 Jahre" },
  { value: "10+", label: "10+ Jahre" },
];

const TIPS = [
  "Suche nach \u201eFinanzberater\u201c + Stadt für lokale Ergebnisse",
  "Nutze Google mit site:linkedin.com für bessere Ergebnisse",
  "Füge 2-3 Keywords hinzu für spezifischere Profile",
  "Sales Navigator bietet die besten Filter (Premium erforderlich)",
  "Füge 10-20 Prospects pro Session hinzu für optimale Ergebnisse",
];

const SAVED_SEARCHES_KEY = "leadsolution_finder_saved_searches";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractNameFromSlug(url: string): string {
  const match = url.match(/\/in\/([^/?]+)/);
  if (!match) return "";
  const slug = match[1];
  // Remove trailing id numbers like "-12345ab"
  const cleaned = slug.replace(/-[a-f0-9]{5,}$/i, "").replace(/-\d+$/, "");
  return cleaned
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildLinkedInUrl(criteria: SearchCriteria): string {
  const parts = [criteria.position, criteria.city, criteria.keywords]
    .filter(Boolean)
    .join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(parts)}&origin=GLOBAL_SEARCH_HEADER`;
}

function buildSalesNavUrl(criteria: SearchCriteria): string {
  const kw = [criteria.position, criteria.keywords].filter(Boolean).join(" ");
  return `https://www.linkedin.com/sales/search/people?query=(keywords:${encodeURIComponent(kw)})`;
}

function buildGoogleLinkedInUrl(criteria: SearchCriteria): string {
  const q = [
    "site:linkedin.com/in/",
    criteria.position ? `"${criteria.position}"` : "",
    criteria.city ? `"${criteria.city}"` : "",
    criteria.keywords || "",
  ]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function buildGoogleMapsUrl(criteria: SearchCriteria): string {
  const q = [criteria.position, criteria.city].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
}

function buildXingUrl(criteria: SearchCriteria): string {
  const kw = [criteria.position, criteria.city, criteria.keywords]
    .filter(Boolean)
    .join(" ");
  return `https://www.xing.com/search/members?keywords=${encodeURIComponent(kw)}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Minuten`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Stunden`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "vor 1 Tag";
  return `vor ${diffDays} Tagen`;
}

function loadSavedSearches(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

function persistSavedSearches(searches: SavedSearch[]) {
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FinderPage() {
  // Search criteria
  const [criteria, setCriteria] = useState<SearchCriteria>({
    position: "",
    city: "",
    keywords: "",
    experience: "alle",
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Quick-add
  const [quickAdd, setQuickAdd] = useState<QuickAddForm>({
    linkedinUrl: "",
    fullName: "",
    company: "",
    position: "",
    city: "",
  });
  const [addedToday, setAddedToday] = useState(0);
  const [saving, setSaving] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Tips
  const [tipsOpen, setTipsOpen] = useState(false);

  // Load saved searches on mount
  useEffect(() => {
    setSavedSearches(loadSavedSearches());
  }, []);

  // Count today's additions
  const fetchTodayCount = useCallback(async () => {
    const supabase = createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("outreach_prospects")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .eq("source", "linkedin_finder");
    setAddedToday(count ?? 0);
  }, []);

  useEffect(() => {
    fetchTodayCount();
  }, [fetchTodayCount]);

  // Filtered position suggestions
  const filteredSuggestions = criteria.position
    ? POSITION_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(criteria.position.toLowerCase())
      )
    : POSITION_SUGGESTIONS;

  // Whether we have enough criteria to generate links
  const canGenerate = criteria.position.trim().length > 0;

  // Generated links
  const searchLinks = canGenerate
    ? [
        {
          label: "LinkedIn Suche",
          url: buildLinkedInUrl(criteria),
          icon: Link2,
          description: "Personensuche mit Filtern",
        },
        {
          label: "Sales Navigator",
          url: buildSalesNavUrl(criteria),
          icon: UserCheck,
          description: "Premium-Filter (Abo erforderlich)",
        },
        {
          label: "Google LinkedIn Suche",
          url: buildGoogleLinkedInUrl(criteria),
          icon: Globe,
          description: "Öffentliche Profile finden",
        },
        {
          label: "Google Maps Suche",
          url: buildGoogleMapsUrl(criteria),
          icon: MapPin,
          description: "Lokale Unternehmen finden",
        },
        {
          label: "Xing Suche",
          url: buildXingUrl(criteria),
          icon: Search,
          description: "Deutsche Alternative zu LinkedIn",
        },
      ]
    : [];

  // ---- Handlers ----

  function handleLinkedInPaste(value: string) {
    const extracted = extractNameFromSlug(value);
    setQuickAdd((prev) => ({
      ...prev,
      linkedinUrl: value,
      fullName: extracted || prev.fullName,
      position: prev.position || criteria.position,
      city: prev.city || criteria.city,
    }));
  }

  async function saveProspect(clearAfter: boolean) {
    if (!quickAdd.fullName.trim()) {
      toast.error("Bitte gib einen Namen ein.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("outreach_prospects").insert({
        full_name: quickAdd.fullName.trim(),
        company: quickAdd.company.trim() || null,
        position: quickAdd.position.trim() || null,
        city: quickAdd.city.trim() || null,
        linkedin_url: quickAdd.linkedinUrl.trim() || null,
        source: "linkedin_finder",
        status: "neu",
        tags: [],
      });
      if (error) throw error;
      toast.success(`${quickAdd.fullName} wurde hinzugefügt.`);
      setAddedToday((c) => c + 1);
      if (clearAfter) {
        setQuickAdd({
          linkedinUrl: "",
          fullName: "",
          company: "",
          position: criteria.position,
          city: criteria.city,
        });
      }
    } catch {
      toast.error("Fehler beim Speichern. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveSearch() {
    if (!criteria.position.trim()) {
      toast.error("Bitte gib eine Position an, bevor du die Suche speicherst.");
      return;
    }
    const label = [criteria.position, criteria.city]
      .filter(Boolean)
      .join(" ");
    const entry: SavedSearch = {
      criteria: { ...criteria },
      savedAt: new Date().toISOString(),
      label,
    };
    const updated = [entry, ...savedSearches].slice(0, 20);
    setSavedSearches(updated);
    persistSavedSearches(updated);
    toast.success("Suche gespeichert.");
  }

  function handleLoadSearch(search: SavedSearch) {
    setCriteria(search.criteria);
  }

  function handleDeleteSearch(index: number) {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    persistSavedSearches(updated);
  }

  // ---- Render ----

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/outreach">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Outreach
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">LinkedIn Prospect Finder</h1>
        </div>
        <Badge variant="secondary" className="w-fit text-sm">
          <UserPlus className="mr-1 h-4 w-4" />
          {addedToday} Prospects heute hinzugefügt
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Section 1: Suchkriterien */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Suchkriterien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Position */}
              <div className="relative">
                <Label htmlFor="position">Position / Beruf</Label>
                <Input
                  id="position"
                  placeholder="z.B. Finanzberater"
                  value={criteria.position}
                  onChange={(e) =>
                    setCriteria((c) => ({ ...c, position: e.target.value }))
                  }
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                  className="mt-1"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent"
                        onMouseDown={() => {
                          setCriteria((c) => ({ ...c, position: s }));
                          setShowSuggestions(false);
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* City */}
              <div>
                <Label htmlFor="city">Stadt / Region</Label>
                <Input
                  id="city"
                  placeholder='z.B. "Kassel", "Frankfurt", "München"'
                  value={criteria.city}
                  onChange={(e) =>
                    setCriteria((c) => ({ ...c, city: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Keywords */}
              <div>
                <Label htmlFor="keywords">Zusätzliche Keywords (optional)</Label>
                <Input
                  id="keywords"
                  placeholder='z.B. "Altersvorsorge", "Baufinanzierung"'
                  value={criteria.keywords}
                  onChange={(e) =>
                    setCriteria((c) => ({ ...c, keywords: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Experience */}
              <div>
                <Label>Erfahrung</Label>
                <Select
                  value={criteria.experience}
                  onValueChange={(val) =>
                    setCriteria((c) => ({ ...c, experience: val }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveSearch}
                  disabled={!criteria.position.trim()}
                >
                  <Clock className="mr-1 h-4 w-4" />
                  Suche speichern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Generierte Such-Links */}
          {canGenerate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generierte Such-Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {searchLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <div
                        key={link.label}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{link.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {link.description}
                            </p>
                          </div>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            Öffnen
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Tipps & Best Practices */}
          <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="h-5 w-5" />
                    Tipps &amp; Best Practices
                    <ChevronDown
                      className={`ml-auto h-4 w-4 transition-transform ${tipsOpen ? "rotate-180" : ""}`}
                    />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {TIPS.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-0.5 text-primary">&#8226;</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section 5: Gespeicherte Suchen */}
          {savedSearches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Gespeicherte Suchen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedSearches.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => handleLoadSearch(s)}
                      >
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(s.savedAt)}
                        </p>
                      </button>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadSearch(s)}
                        >
                          Laden
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSearch(i)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Quick-Add Prospect (sticky on desktop) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5" />
                Quick-Add Prospect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* LinkedIn URL */}
              <div>
                <Label htmlFor="linkedin-url">LinkedIn URL</Label>
                <Input
                  id="linkedin-url"
                  placeholder="https://www.linkedin.com/in/..."
                  value={quickAdd.linkedinUrl}
                  onChange={(e) => handleLinkedInPaste(e.target.value)}
                  onPaste={(e) => {
                    // Handle paste event for immediate extraction
                    const pasted = e.clipboardData.getData("text");
                    if (pasted) {
                      e.preventDefault();
                      handleLinkedInPaste(pasted);
                    }
                  }}
                  className="mt-1 text-base"
                />
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="qa-name">Name</Label>
                <Input
                  id="qa-name"
                  placeholder="Max Mustermann"
                  value={quickAdd.fullName}
                  onChange={(e) =>
                    setQuickAdd((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Company */}
              <div>
                <Label htmlFor="qa-company">Firma</Label>
                <Input
                  id="qa-company"
                  placeholder="Firma"
                  value={quickAdd.company}
                  onChange={(e) =>
                    setQuickAdd((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Position */}
              <div>
                <Label htmlFor="qa-position">Position</Label>
                <Input
                  id="qa-position"
                  placeholder="Finanzberater"
                  value={quickAdd.position}
                  onChange={(e) =>
                    setQuickAdd((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* City */}
              <div>
                <Label htmlFor="qa-city">Stadt</Label>
                <Input
                  id="qa-city"
                  placeholder="Stadt"
                  value={quickAdd.city}
                  onChange={(e) =>
                    setQuickAdd((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => saveProspect(false)}
                  disabled={saving || !quickAdd.fullName.trim()}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Zu Outreach hinzufügen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => saveProspect(true)}
                  disabled={saving || !quickAdd.fullName.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Hinzufügen &amp; Nächsten
                </Button>
              </div>

              {/* Counter */}
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="text-lg font-bold text-foreground">
                    {addedToday}
                  </span>{" "}
                  Prospects heute hinzugefügt
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
