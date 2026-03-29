"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Loader2 } from "lucide-react"
import type { Database } from "@/types/database"

type Tag = Database["public"]["Tables"]["tags"]["Row"]

interface TagManagerProps {
  leadId: string
}

function createSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function TagManager({ leadId }: TagManagerProps) {
  const [leadTags, setLeadTags] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [showInput, setShowInput] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadTags = useCallback(async () => {
    const supabase = createSupabase()

    const [leadTagsResult, allTagsResult] = await Promise.all([
      supabase
        .from("lead_tags")
        .select("tag_id, tags(id, name, color, created_by, created_at)")
        .eq("lead_id", leadId),
      supabase.from("tags").select("*").order("name"),
    ])

    if (leadTagsResult.data) {
      const tags = leadTagsResult.data
        .map((lt) => {
          const t = lt.tags
          if (!t) return null
          // Handle both array and object returns from Supabase
          const tag = Array.isArray(t) ? t[0] : t
          return tag as Tag
        })
        .filter(Boolean) as Tag[]
      setLeadTags(tags)
    }

    if (allTagsResult.data) {
      setAllTags(allTagsResult.data)
    }
  }, [leadId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const addTag = async (tag: Tag) => {
    setLoading(true)
    const supabase = createSupabase()
    await supabase
      .from("lead_tags")
      .insert({ lead_id: leadId, tag_id: tag.id })
    setLeadTags([...leadTags, tag])
    setSearch("")
    setShowInput(false)
    setLoading(false)
  }

  const createAndAddTag = async (name: string) => {
    if (!name.trim()) return
    setLoading(true)
    const supabase = createSupabase()

    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
    ]
    const color = colors[Math.floor(Math.random() * colors.length)]

    const { data } = await supabase
      .from("tags")
      .insert({ name: name.trim(), color })
      .select()
      .single()

    if (data) {
      await supabase
        .from("lead_tags")
        .insert({ lead_id: leadId, tag_id: data.id })
      setLeadTags([...leadTags, data])
      setAllTags([...allTags, data])
    }

    setSearch("")
    setShowInput(false)
    setLoading(false)
  }

  const removeTag = async (tagId: string) => {
    const supabase = createSupabase()
    await supabase
      .from("lead_tags")
      .delete()
      .eq("lead_id", leadId)
      .eq("tag_id", tagId)
    setLeadTags(leadTags.filter((t) => t.id !== tagId))
  }

  const assignedIds = new Set(leadTags.map((t) => t.id))
  const filtered = allTags.filter(
    (t) =>
      !assignedIds.has(t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  )
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === search.toLowerCase()
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {leadTags.map((tag) => (
        <Badge
          key={tag.id}
          className="gap-1 text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button
            onClick={() => removeTag(tag.id)}
            className="ml-0.5 rounded-full hover:bg-white/20"
            aria-label={`Tag ${tag.name} entfernen`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {showInput ? (
        <div className="relative">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                if (filtered.length > 0) {
                  addTag(filtered[0])
                } else if (!exactMatch) {
                  createAndAddTag(search)
                }
              }
              if (e.key === "Escape") {
                setShowInput(false)
                setSearch("")
              }
            }}
            placeholder="Tag suchen oder erstellen..."
            className="h-7 w-48 text-xs"
            disabled={loading}
          />
          {search && (
            <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-md border bg-popover shadow-md">
              {filtered.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => addTag(tag)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
              {!exactMatch && search.trim() && (
                <button
                  onClick={() => createAndAddTag(search)}
                  className="flex w-full items-center gap-2 border-t px-3 py-1.5 text-xs text-blue-600 hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  &quot;{search.trim()}&quot; erstellen
                </button>
              )}
              {filtered.length === 0 && exactMatch && (
                <p className="px-3 py-1.5 text-xs text-muted-foreground">
                  Keine weiteren Tags
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setShowInput(true)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  )
}
