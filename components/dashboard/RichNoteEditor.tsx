"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Save, Loader2 } from "lucide-react"
import type { Database } from "@/types/database"

interface RichNoteEditorProps {
  leadId: string
  onSave?: () => void
}

const QUICK_TEMPLATES = [
  "Nicht erreichbar \u2014 Mailbox",
  "R\u00fcckruf vereinbart am...",
  "Kein Interesse \u2014 Grund:",
]

function createSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function RichNoteEditor({ leadId, onSave }: RichNoteEditorProps) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!text.trim()) return
    setSaving(true)
    const supabase = createSupabase()
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "notiz",
      title: "Notiz",
      description: text.trim(),
    })
    setText("")
    setSaving(false)
    onSave?.()
  }

  const insertTemplate = (template: string) => {
    setText((prev) => (prev ? `${prev}\n${template}` : template))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {QUICK_TEMPLATES.map((template) => (
          <Button
            key={template}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => insertTemplate(template)}
          >
            {template}
          </Button>
        ))}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Notiz hinzuf\u00fcgen..."
        className="min-h-[80px] text-sm"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !text.trim()}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  )
}
