"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function InviteBeraterDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  function resetForm() {
    setName("")
    setEmail("")
    setPhone("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !email.trim()) {
      toast.error("Name und E-Mail sind erforderlich")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/berater/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      })

      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok) {
        throw new Error(data.error || "Einladung fehlgeschlagen")
      }

      toast.success(`Einladung gesendet an ${email.trim()}`)
      resetForm()
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-1 h-4 w-4" />
          Berater einladen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Berater einladen</DialogTitle>
            <DialogDescription>
              Sende eine Einladung per E-Mail an einen neuen Berater.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="invite-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="invite-name"
                placeholder="Max Mustermann"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium">
                E-Mail <span className="text-destructive">*</span>
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="max@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invite-phone" className="text-sm font-medium">
                Telefon
              </label>
              <Input
                id="invite-phone"
                type="tel"
                placeholder="+49 123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Einladung senden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
