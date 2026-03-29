"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowRightLeft, RefreshCw, Trash2 } from "lucide-react";
import { getStatusLabel } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminLeadActionsProps {
  leadId: string;
  currentStatus: string;
  currentBeraterId: string | null;
  beraterOptions: { id: string; name: string }[];
}

const ALL_STATUSES = [
  "neu",
  "zugewiesen",
  "kontaktversuch",
  "nicht_erreicht",
  "qualifiziert",
  "termin",
  "show",
  "no_show",
  "nachfassen",
  "abschluss",
  "verloren",
  "warteschlange",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminLeadActions({
  leadId,
  currentStatus,
  currentBeraterId,
  beraterOptions,
}: AdminLeadActionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [newStatus, setNewStatus] = useState(currentStatus);
  const [newBeraterId, setNewBeraterId] = useState(currentBeraterId ?? "");
  const [statusLoading, setStatusLoading] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleStatusChange() {
    if (newStatus === currentStatus) return;
    setStatusLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("leads")
      .update({
        status: newStatus as "neu" | "zugewiesen" | "kontaktversuch" | "nicht_erreicht" | "qualifiziert" | "termin" | "show" | "no_show" | "nachfassen" | "abschluss" | "verloren" | "warteschlange",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "status_change",
      title: "Status geändert (Admin)",
      description: `${getStatusLabel(currentStatus)} \u2192 ${getStatusLabel(newStatus)}`,
      old_value: currentStatus,
      new_value: newStatus,
      created_by: user?.id ?? null,
    });

    setStatusLoading(false);
    router.refresh();
  }

  async function handleReassign() {
    if (!newBeraterId || newBeraterId === currentBeraterId) return;
    setReassignLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("leads")
      .update({
        berater_id: newBeraterId,
        zugewiesen_am: new Date().toISOString(),
        status: "zugewiesen" as const,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Deactivate old assignment
    if (currentBeraterId) {
      await supabase
        .from("lead_assignments")
        .update({ is_active: false })
        .eq("lead_id", leadId)
        .eq("is_active", true);
    }

    // Create new assignment
    await supabase.from("lead_assignments").insert({
      lead_id: leadId,
      berater_id: newBeraterId,
      reason: "admin_reassign",
      is_active: true,
    });

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "zuweisung",
      title: "Neu zugewiesen (Admin)",
      description: `Lead wurde manuell durch Admin neu zugewiesen.`,
      created_by: user?.id ?? null,
    });

    setReassignLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleteLoading(true);

    // Delete related records first
    await supabase.from("lead_activities").delete().eq("lead_id", leadId);
    await supabase.from("lead_assignments").delete().eq("lead_id", leadId);
    await supabase.from("lead_tags").delete().eq("lead_id", leadId);
    await supabase.from("nachrichten").delete().eq("lead_id", leadId);
    await supabase.from("termine").delete().eq("lead_id", leadId);
    await supabase.from("leads").delete().eq("id", leadId);

    setDeleteLoading(false);
    router.push("/admin/leads");
  }

  return (
    <div className="space-y-4">
      {/* Change Status */}
      <div className="space-y-2">
        <Label className="text-sm">Status ändern</Label>
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="w-full"
          onClick={handleStatusChange}
          disabled={statusLoading || newStatus === currentStatus}
        >
          {statusLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Status aktualisieren
        </Button>
      </div>

      <Separator />

      {/* Reassign */}
      <div className="space-y-2">
        <Label className="text-sm">Berater zuweisen</Label>
        <Select value={newBeraterId} onValueChange={setNewBeraterId}>
          <SelectTrigger>
            <SelectValue placeholder="Berater wählen..." />
          </SelectTrigger>
          <SelectContent>
            {beraterOptions.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="w-full"
          variant="outline"
          onClick={handleReassign}
          disabled={
            reassignLoading || !newBeraterId || newBeraterId === currentBeraterId
          }
        >
          {reassignLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="mr-2 h-4 w-4" />
          )}
          Neu zuweisen
        </Button>
      </div>

      <Separator />

      {/* Delete */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="destructive"
            className="w-full"
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Lead löschen
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lead unwiderruflich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Lead und alle zugehörigen Aktivitäten, Nachrichten, Termine
              und Tags werden dauerhaft gelöscht. Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
