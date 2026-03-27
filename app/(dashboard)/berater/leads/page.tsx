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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeadPipeline } from "@/components/dashboard/LeadPipeline";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Tables } from "@/types/database";

type Lead = Tables<"leads">;

const STATUS_OPTIONS = [
  { value: "alle", label: "Alle Status" },
  { value: "zugewiesen", label: "Zugewiesen" },
  { value: "kontaktversuch", label: "Kontaktversuch" },
  { value: "nicht_erreicht", label: "Nicht erreicht" },
  { value: "qualifiziert", label: "Qualifiziert" },
  { value: "termin", label: "Termin" },
  { value: "show", label: "Show" },
  { value: "no_show", label: "No-Show" },
  { value: "nachfassen", label: "Nachfassen" },
  { value: "abschluss", label: "Abschluss" },
  { value: "verloren", label: "Verloren" },
];

export default function BeraterLeadsPage() {
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

    // Get berater record
    const { data: berater } = await supabase
      .from("berater")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!berater) return;

    let query = supabase
      .from("leads")
      .select("*")
      .eq("berater_id", berater.id)
      .order("created_at", { ascending: false });

    if (statusFilter !== "alle") {
      query = query.eq("status", statusFilter as Lead["status"]);
    }

    const { data } = await query;
    setLeads(data ?? []);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, supabase]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (lead.vorname ?? '').toLowerCase().includes(q) ||
      (lead.nachname ?? '').toLowerCase().includes(q) ||
      (lead.email ?? '').toLowerCase().includes(q) ||
      (lead.telefon?.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleStatusChange(leadId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus as Lead["status"] })
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Status aktualisiert");
      fetchLeads();
    } catch (err) {
      console.error("Error updating lead status:", err);
      toast.error("Fehler beim Aktualisieren des Status");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meine Leads</h1>
        <p className="text-muted-foreground">
          Alle Ihnen zugewiesenen Leads im Überblick
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {filteredLeads.length} Lead{filteredLeads.length !== 1 ? "s" : ""}
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
          <Tabs defaultValue="tabelle">
            <TabsList className="mb-4">
              <TabsTrigger value="tabelle">Tabelle</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            </TabsList>

            <TabsContent value="tabelle">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredLeads.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Keine Leads gefunden.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Zugewiesen am</TableHead>
                      <TableHead>Letzter Kontakt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/berater/leads/${lead.id}`)}
                      >
                        <TableCell className="font-medium">
                          {lead.vorname} {lead.nachname}
                        </TableCell>
                        <TableCell>{lead.telefon ?? "-"}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(lead.status)}`}
                          >
                            {getStatusLabel(lead.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {lead.zugewiesen_am
                            ? formatDate(lead.zugewiesen_am)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {lead.erster_kontakt_am
                            ? formatDate(lead.erster_kontakt_am)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="pipeline">
              {isLoading ? (
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[400px] w-[260px] shrink-0 rounded-lg" />
                  ))}
                </div>
              ) : (
                <LeadPipeline
                  leads={filteredLeads}
                  onStatusChange={handleStatusChange}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
