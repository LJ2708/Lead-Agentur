"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Upload,
  AlertTriangle,
  ExternalLink,
  ArrowUpDown,
  Link2,
  UserSearch,
} from "lucide-react";
import Link from "next/link";
import { OutreachStats } from "@/components/outreach/OutreachStats";
import { ProspectDialog } from "@/components/outreach/ProspectDialog";
import { MessageComposer } from "@/components/outreach/MessageComposer";
import { ImportProspectsDialog } from "@/components/outreach/ImportProspectsDialog";
import type { Tables } from "@/types/database";

type Prospect = Tables<"outreach_prospects">;

const PIPELINE_COLUMNS = [
  { key: "neu", label: "Neu", color: "bg-gray-100" },
  { key: "kontaktiert", label: "Kontaktiert", color: "bg-blue-50" },
  { key: "interessiert", label: "Interessiert", color: "bg-purple-50" },
  { key: "demo_vereinbart", label: "Demo vereinbart", color: "bg-indigo-50" },
  {
    key: "demo_durchgefuehrt",
    label: "Demo durchgef\u00fchrt",
    color: "bg-cyan-50",
  },
  { key: "angebot", label: "Angebot", color: "bg-amber-50" },
  { key: "gewonnen", label: "Gewonnen", color: "bg-green-50" },
  { key: "verloren", label: "Verloren", color: "bg-red-50" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  kontaktiert: "Kontaktiert",
  interessiert: "Interessiert",
  demo_vereinbart: "Demo vereinbart",
  demo_durchgefuehrt: "Demo durchgef\u00fchrt",
  angebot: "Angebot",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

type SortField =
  | "full_name"
  | "company"
  | "status"
  | "contact_count"
  | "last_contacted_at"
  | "next_followup_at"
  | "created_at";

export default function OutreachPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [prospectDialogOpen, setProspectDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchProspects = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("outreach_prospects")
      .select("*")
      .order("created_at", { ascending: false });
    setProspects(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const filteredProspects = useMemo(() => {
    if (!search.trim()) return prospects;
    const q = search.toLowerCase();
    return prospects.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.company && p.company.toLowerCase().includes(q))
    );
  }, [prospects, search]);

  const sortedProspects = useMemo(() => {
    const sorted = [...filteredProspects];
    sorted.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortField) {
        case "full_name":
          aVal = a.full_name;
          bVal = b.full_name;
          break;
        case "company":
          aVal = a.company ?? "";
          bVal = b.company ?? "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "contact_count":
          aVal = a.contact_count;
          bVal = b.contact_count;
          break;
        case "last_contacted_at":
          aVal = a.last_contacted_at ?? "";
          bVal = b.last_contacted_at ?? "";
          break;
        case "next_followup_at":
          aVal = a.next_followup_at ?? "";
          bVal = b.next_followup_at ?? "";
          break;
        case "created_at":
          aVal = a.created_at;
          bVal = b.created_at;
          break;
      }

      if (aVal === null || bVal === null) return 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), "de");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredProspects, sortField, sortDir]);

  const followupProspects = useMemo(
    () =>
      prospects.filter(
        (p) =>
          p.next_followup_at &&
          p.status !== "gewonnen" &&
          p.status !== "verloren"
      ),
    [prospects]
  );

  const overdueProspects = useMemo(
    () => followupProspects.filter((p) => isOverdue(p.next_followup_at)),
    [followupProspects]
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleEditProspect(prospect: Prospect) {
    setEditingProspect(prospect);
    setProspectDialogOpen(true);
  }

  function handleNewProspect() {
    setEditingProspect(null);
    setProspectDialogOpen(true);
  }

  function handleCardClick(prospect: Prospect) {
    setDetailProspect(prospect);
  }

  async function handleStatusChange(prospectId: string, newStatus: string) {
    const supabase = createClient();
    await supabase
      .from("outreach_prospects")
      .update({ status: newStatus })
      .eq("id", prospectId);
    fetchProspects();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Lade Outreach-Daten...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Outreach</h1>
        <div className="flex gap-2">
          <Link href="/admin/outreach/finder">
            <Button variant="outline">
              <UserSearch className="mr-2 h-4 w-4" />
              Prospects finden
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            CSV Import
          </Button>
          <Button onClick={handleNewProspect}>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Prospect
          </Button>
        </div>
      </div>

      {/* Stats */}
      <OutreachStats prospects={prospects} />

      {/* Follow-up Alerts */}
      {overdueProspects.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <AlertTriangle className="h-5 w-5" />
              {overdueProspects.length} \u00fcberf\u00e4llige Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {overdueProspects.slice(0, 10).map((p) => (
                <Badge
                  key={p.id}
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => handleCardClick(p)}
                >
                  {p.full_name}
                  {p.company ? ` (${p.company})` : ""} \u2014{" "}
                  {formatDate(p.next_followup_at)}
                </Badge>
              ))}
              {overdueProspects.length > 10 && (
                <Badge variant="outline">
                  +{overdueProspects.length - 10} weitere
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nach Name oder Firma suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
        </TabsList>

        {/* Pipeline View */}
        <TabsContent value="pipeline">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_COLUMNS.map((col) => {
              const colProspects = filteredProspects.filter(
                (p) => p.status === col.key
              );
              return (
                <div
                  key={col.key}
                  className={`flex min-w-[260px] flex-col rounded-lg border ${col.color}`}
                >
                  <div className="flex items-center justify-between border-b p-3">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {colProspects.length}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2 p-2">
                    {colProspects.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Keine Prospects
                      </p>
                    )}
                    {colProspects.map((prospect) => (
                      <Card
                        key={prospect.id}
                        className="cursor-pointer transition-shadow hover:shadow-md"
                        onClick={() => handleCardClick(prospect)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {prospect.full_name}
                              </p>
                              {prospect.company && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {prospect.company}
                                </p>
                              )}
                            </div>
                            {prospect.linkedin_url && (
                              <a
                                href={prospect.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 text-blue-600 hover:text-blue-800"
                              >
                                <Link2 className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Kontakte: {prospect.contact_count}
                            </span>
                            {prospect.last_contacted_at && (
                              <span>
                                | {formatDate(prospect.last_contacted_at)}
                              </span>
                            )}
                          </div>
                          {prospect.next_followup_at && (
                            <p
                              className={`mt-1 text-xs ${
                                isOverdue(prospect.next_followup_at)
                                  ? "font-semibold text-red-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Follow-up:{" "}
                              {formatDate(prospect.next_followup_at)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Table View */}
        <TabsContent value="tabelle">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("full_name")}
                    >
                      Name
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("company")}
                    >
                      Firma
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("contact_count")}
                    >
                      Kontakte
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("last_contacted_at")}
                    >
                      Letzter Kontakt
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("next_followup_at")}
                    >
                      Follow-up
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProspects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Keine Prospects gefunden.
                    </TableCell>
                  </TableRow>
                )}
                {sortedProspects.map((prospect) => (
                  <TableRow
                    key={prospect.id}
                    className="cursor-pointer"
                    onClick={() => handleCardClick(prospect)}
                  >
                    <TableCell className="font-medium">
                      {prospect.full_name}
                    </TableCell>
                    <TableCell>{prospect.company ?? "\u2014"}</TableCell>
                    <TableCell>{prospect.position ?? "\u2014"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {STATUS_LABELS[prospect.status] ?? prospect.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{prospect.contact_count}</TableCell>
                    <TableCell>
                      {formatDate(prospect.last_contacted_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          isOverdue(prospect.next_followup_at)
                            ? "font-semibold text-red-600"
                            : ""
                        }
                      >
                        {formatDate(prospect.next_followup_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {prospect.linkedin_url ? (
                        <a
                          href={prospect.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        "\u2014"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProspect(prospect);
                        }}
                      >
                        Bearbeiten
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Prospect Dialog (Add/Edit) */}
      <ProspectDialog
        open={prospectDialogOpen}
        onOpenChange={(open) => {
          setProspectDialogOpen(open);
          if (!open) setEditingProspect(null);
        }}
        prospect={editingProspect}
        onSaved={fetchProspects}
      />

      {/* Import Dialog */}
      <ImportProspectsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={fetchProspects}
      />

      {/* Detail Dialog with MessageComposer */}
      <Dialog
        open={!!detailProspect}
        onOpenChange={(open) => {
          if (!open) setDetailProspect(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {detailProspect && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detailProspect.full_name}
                  {detailProspect.linkedin_url && (
                    <a
                      href={detailProspect.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Link2 className="h-5 w-5" />
                    </a>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {[
                    detailProspect.position,
                    detailProspect.company,
                    detailProspect.city,
                  ]
                    .filter(Boolean)
                    .join(" \u2022 ") || "Keine weiteren Informationen"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">
                      <Select
                        value={detailProspect.status}
                        onValueChange={(val) => {
                          handleStatusChange(detailProspect.id, val);
                          setDetailProspect({ ...detailProspect, status: val });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINE_COLUMNS.map((col) => (
                            <SelectItem key={col.key} value={col.key}>
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kontakte</p>
                    <p className="mt-1 text-sm font-medium">
                      {detailProspect.contact_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Letzter Kontakt
                    </p>
                    <p className="mt-1 text-sm">
                      {formatDate(detailProspect.last_contacted_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Follow-up</p>
                    <p
                      className={`mt-1 text-sm ${
                        isOverdue(detailProspect.next_followup_at)
                          ? "font-semibold text-red-600"
                          : ""
                      }`}
                    >
                      {formatDate(detailProspect.next_followup_at)}
                    </p>
                  </div>
                </div>

                {/* Contact details */}
                {(detailProspect.email || detailProspect.phone) && (
                  <div className="flex flex-wrap gap-4 text-sm">
                    {detailProspect.email && (
                      <span className="text-muted-foreground">
                        E-Mail:{" "}
                        <a
                          href={`mailto:${detailProspect.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {detailProspect.email}
                        </a>
                      </span>
                    )}
                    {detailProspect.phone && (
                      <span className="text-muted-foreground">
                        Tel: {detailProspect.phone}
                      </span>
                    )}
                  </div>
                )}

                {/* Tags */}
                {detailProspect.tags && detailProspect.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {detailProspect.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {detailProspect.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notizen</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {detailProspect.notes}
                    </p>
                  </div>
                )}

                {/* Message Composer */}
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-semibold">
                    Nachricht senden
                  </h3>
                  <MessageComposer
                    prospect={detailProspect}
                    onSent={() => {
                      fetchProspects();
                      setDetailProspect(null);
                    }}
                  />
                </div>

                {/* Edit button */}
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailProspect(null);
                      handleEditProspect(detailProspect);
                    }}
                  >
                    Prospect bearbeiten
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
