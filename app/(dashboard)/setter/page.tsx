"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Search, Phone, Headphones } from "lucide-react";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads"> & {
  berater_name?: string | null;
};

const STATUS_OPTIONS = [
  { value: "alle", label: "Alle Status" },
  { value: "zugewiesen", label: "Zugewiesen" },
  { value: "kontaktversuch", label: "Kontaktversuch" },
  { value: "nicht_erreicht", label: "Nicht erreicht" },
  { value: "qualifiziert", label: "Qualifiziert" },
  { value: "termin", label: "Termin" },
];

export default function SetterWorkListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("alle");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("leads")
      .select("*, berater:berater_id(id, profile_id, profiles:profile_id(full_name))")
      .eq("setter_id", user.id)
      .order("created_at", { ascending: false });

    if (statusFilter !== "alle") {
      query = query.eq("status", statusFilter as any);
    }

    const { data } = await query;

    const enrichedLeads: Lead[] = (data ?? []).map((l: any) => ({
      ...l,
      berater_name: l.berater?.profiles
        ? (l.berater.profiles.full_name ?? null)
        : null,
      berater: undefined,
    }));

    setLeads(enrichedLeads);
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (lead.vorname ?? '').toLowerCase().includes(q) ||
      (lead.nachname ?? '').toLowerCase().includes(q) ||
      (lead.telefon?.toLowerCase().includes(q) ?? false)
    );
  });

  // Priority sorting: zugewiesen first, then by date
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const statusPriority: Record<string, number> = {
      zugewiesen: 0,
      kontaktversuch: 1,
      nicht_erreicht: 2,
      qualifiziert: 3,
      termin: 4,
    };
    const aPriority = statusPriority[a.status] ?? 99;
    const bPriority = statusPriority[b.status] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <Headphones className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meine Leads</h1>
          <p className="text-muted-foreground">
            Setter-Arbeitsliste: Leads kontaktieren und qualifizieren
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {sortedLeads.length} Lead{sortedLeads.length !== 1 ? "s" : ""}
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val ?? "")}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedLeads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Phone className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Keine Leads gefunden.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Berater</TableHead>
                  <TableHead>Zugewiesen am</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/setter/leads/${lead.id}`)}
                  >
                    <TableCell className="font-medium">
                      {lead.vorname} {lead.nachname}
                    </TableCell>
                    <TableCell>
                      {lead.telefon ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {lead.telefon}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(lead.status)}`}
                      >
                        {getStatusLabel(lead.status)}
                      </span>
                    </TableCell>
                    <TableCell>{lead.berater_name ?? "-"}</TableCell>
                    <TableCell>
                      {lead.zugewiesen_am
                        ? formatDate(lead.zugewiesen_am)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
