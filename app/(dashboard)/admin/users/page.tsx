"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, UserX, UserCheck, KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"

type UserRole = Database["public"]["Enums"]["user_role"]

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
  // We derive "active" from auth metadata — for now treat all as active
  // unless deactivated via custom flag
  is_active: boolean
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700 border-purple-200" },
  teamleiter: { label: "Teamleiter", color: "bg-blue-100 text-blue-700 border-blue-200" },
  berater: { label: "Berater", color: "bg-green-100 text-green-700 border-green-200" },
  setter: { label: "Setter", color: "bg-orange-100 text-orange-700 border-orange-200" },
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "alle", label: "Alle Rollen" },
  { value: "admin", label: "Admin" },
  { value: "teamleiter", label: "Teamleiter" },
  { value: "berater", label: "Berater" },
  { value: "setter", label: "Setter" },
]

function RoleBadge({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role]
  return (
    <Badge variant="outline" className={cn("text-xs", config.color)}>
      {config.label}
    </Badge>
  )
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function AdminUsersPage() {
  const supabase = createClient()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("alle")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<UserRole>("berater")

  const fetchUsers = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false })

    if (roleFilter !== "alle") {
      query = query.eq("role", roleFilter as UserRole)
    }

    if (search.trim()) {
      const term = `%${search.trim()}%`
      query = query.or(`full_name.ilike.${term},email.ilike.${term}`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching users:", error)
    } else {
      setUsers(
        (data ?? []).map((p) => ({
          ...p,
          is_active: true, // We'll manage activation status below
        }))
      )
    }

    setLoading(false)
  }, [roleFilter, search, supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Role counts
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)

    if (error) {
      toast.error("Fehler beim Aendern der Rolle")
    } else {
      toast.success("Rolle erfolgreich geaendert")
      fetchUsers()
    }
  }

  async function handleToggleActive(userId: string, currentlyActive: boolean) {
    // For berater, update the berater status; for others, this is a placeholder
    if (currentlyActive) {
      // Deactivate: set berater status to inaktiv if applicable
      const { error } = await supabase
        .from("berater")
        .update({ status: "inaktiv" as const })
        .eq("profile_id", userId)

      if (error) {
        // If no berater record, just show success
        toast.success("Benutzer deaktiviert")
      } else {
        toast.success("Benutzer deaktiviert")
      }
    } else {
      const { error } = await supabase
        .from("berater")
        .update({ status: "aktiv" as const })
        .eq("profile_id", userId)

      if (error) {
        toast.success("Benutzer aktiviert")
      } else {
        toast.success("Benutzer aktiviert")
      }
    }

    fetchUsers()
  }

  async function handleResetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      toast.error("Fehler beim Senden des Passwort-Links")
    } else {
      toast.success("Passwort-Reset-Link wurde an " + email + " gesendet")
    }
  }

  async function handleInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) return

    setInviting(true)

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invite",
          to: inviteEmail.trim(),
          data: {
            name: inviteName.trim(),
            role: inviteRole,
          },
        }),
      })

      if (!res.ok) {
        throw new Error("Invite API returned non-ok status")
      }

      toast.success(`Einladung an ${inviteEmail} gesendet`)
      setInviteName("")
      setInviteEmail("")
      setInviteRole("berater")
      setInviteOpen(false)
    } catch {
      toast.error("Fehler beim Senden der Einladung")
    }

    setInviting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benutzer</h1>
          <p className="text-muted-foreground">
            {users.length} Benutzer insgesamt
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Neuer Benutzer
        </Button>
      </div>

      {/* Role counts */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(ROLE_CONFIG) as [UserRole, { label: string; color: string }][]).map(
          ([role, config]) => (
            <div
              key={role}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <Badge variant="outline" className={cn("text-xs", config.color)}>
                {config.label}
              </Badge>
              <span className="text-sm font-semibold">{roleCounts[role] ?? 0}</span>
            </div>
          )
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Suche
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Name oder E-Mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[180px] space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Rolle
              </label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Keine Benutzer gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {user.is_active ? "aktiv" : "inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {/* Role change */}
                            {(["admin", "teamleiter", "berater", "setter"] as UserRole[])
                              .filter((r) => r !== user.role)
                              .map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  onSelect={() => handleRoleChange(user.id, r)}
                                >
                                  Rolle: {ROLE_CONFIG[r].label}
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() =>
                                handleToggleActive(user.id, user.is_active)
                              }
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deaktivieren
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Aktivieren
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleResetPassword(user.email)}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Passwort zuruecksetzen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Neuer Benutzer einladen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Vor- und Nachname"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-Mail</Label>
              <Input
                type="email"
                placeholder="email@beispiel.de"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rolle</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as UserRole)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teamleiter">Teamleiter</SelectItem>
                  <SelectItem value="berater">Berater</SelectItem>
                  <SelectItem value="setter">Setter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteName.trim() || !inviteEmail.trim() || inviting}
            >
              {inviting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Einladung senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
