"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { MailOpen, Plus, Save, Trash2, Loader2, Eye } from "lucide-react"
import type { Database } from "@/types/database"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

const SAMPLE_DATA: Record<string, string> = {
  "{{vorname}}": "Max",
  "{{nachname}}": "Mustermann",
  "{{email}}": "max@beispiel.de",
  "{{telefon}}": "+49 170 1234567",
  "{{berater_name}}": "Anna Schmidt",
}

function createSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function replaceVariables(text: string): string {
  let result = text
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replaceAll(key, value)
  }
  return result
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const selected = templates.find((t) => t.id === selectedId) ?? null

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const supabase = createSupabase()
    const { data } = await supabase
      .from("routing_config")
      .select("key, value")
      .like("key", "email_template_%")

    const loaded: EmailTemplate[] = (data ?? []).map((row) => {
      const val = row.value as any
      return {
        id: row.key,
        name: val?.name ?? row.key.replace("email_template_", ""),
        subject: val?.subject ?? "",
        body: val?.body ?? "",
      }
    })
    setTemplates(loaded)
    if (loaded.length > 0 && !selectedId) {
      setSelectedId(loaded[0].id)
    }
    setLoading(false)
  }, [selectedId])

  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveTemplate = async (template: EmailTemplate) => {
    setSaving(true)
    const supabase = createSupabase()
    const { data: existing } = await supabase
      .from("routing_config")
      .select("id")
      .eq("key", template.id)
      .maybeSingle()

    const payload = {
      name: template.name,
      subject: template.subject,
      body: template.body,
    }

    if (existing) {
      await supabase
        .from("routing_config")
        .update({ value: payload as any })
        .eq("key", template.id)
    } else {
      await supabase.from("routing_config").insert({
        key: template.id,
        value: payload as any,
        description: `E-Mail-Vorlage: ${template.name}`,
      })
    }
    setSaving(false)
  }

  const addTemplate = () => {
    const id = `email_template_${Date.now()}`
    const newTemplate: EmailTemplate = {
      id,
      name: "Neue Vorlage",
      subject: "",
      body: "",
    }
    setTemplates([...templates, newTemplate])
    setSelectedId(id)
  }

  const deleteTemplate = async (templateId: string) => {
    const supabase = createSupabase()
    await supabase.from("routing_config").delete().eq("key", templateId)
    const updated = templates.filter((t) => t.id !== templateId)
    setTemplates(updated)
    if (selectedId === templateId) {
      setSelectedId(updated.length > 0 ? updated[0].id : null)
    }
  }

  const updateSelected = (updates: Partial<EmailTemplate>) => {
    if (!selectedId) return
    setTemplates(
      templates.map((t) =>
        t.id === selectedId ? { ...t, ...updates } : t
      )
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E-Mail-Vorlagen</h1>
          <p className="text-muted-foreground">
            Vorlagen f&uuml;r automatische E-Mails verwalten
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Vorlage
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Template list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailOpen className="h-4 w-4" />
              Vorlagen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedId(t.id)
                  setShowPreview(false)
                }}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === t.id
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {t.name}
              </button>
            ))}
            {templates.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Keine Vorlagen vorhanden
              </p>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selected ? selected.name : "Vorlage ausw\u00e4hlen"}
              </CardTitle>
              {selected && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {showPreview ? "Editor" : "Vorschau"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteTemplate(selected.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    L&ouml;schen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveTemplate(selected)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Speichern
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selected ? (
              showPreview ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Betreff (Vorschau)
                    </Label>
                    <p className="mt-1 font-medium">
                      {replaceVariables(selected.subject)}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Inhalt (Vorschau)
                    </Label>
                    <div className="mt-2 whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-sm">
                      {replaceVariables(selected.body)}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Verf&uuml;gbare Variablen:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(SAMPLE_DATA).join(", ")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tpl-name">Name</Label>
                    <Input
                      id="tpl-name"
                      value={selected.name}
                      onChange={(e) =>
                        updateSelected({ name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tpl-subject">Betreff</Label>
                    <Input
                      id="tpl-subject"
                      value={selected.subject}
                      onChange={(e) =>
                        updateSelected({ subject: e.target.value })
                      }
                      placeholder="z.B. Hallo {{vorname}}, Ihr Termin steht an"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tpl-body">Inhalt</Label>
                    <Textarea
                      id="tpl-body"
                      value={selected.body}
                      onChange={(e) =>
                        updateSelected({ body: e.target.value })
                      }
                      placeholder="Hallo {{vorname}} {{nachname}},&#10;&#10;..."
                      className="mt-1 min-h-[300px] font-mono text-sm"
                    />
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Verf&uuml;gbare Variablen:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(SAMPLE_DATA).join(", ")}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                W&auml;hlen Sie eine Vorlage aus oder erstellen Sie eine neue.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
