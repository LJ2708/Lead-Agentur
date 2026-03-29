"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, ChevronDown } from "lucide-react"
import type { Database } from "@/types/database"

type Tag = Database["public"]["Tables"]["tags"]["Row"]

interface TagFilterProps {
  selectedTags: string[]
  onChange: (tagIds: string[]) => void
}

function createSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function TagFilter({ selectedTags, onChange }: TagFilterProps) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadTags = useCallback(async () => {
    const supabase = createSupabase()
    const { data } = await supabase.from("tags").select("*").order("name")
    if (data) setAllTags(data)
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTags, tagId])
    }
  }

  const removeTag = (tagId: string) => {
    onChange(selectedTags.filter((id) => id !== tagId))
  }

  const selectedTagObjects = allTags.filter((t) => selectedTags.includes(t.id))

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="h-8 gap-1"
      >
        Tags filtern
        {selectedTags.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
            {selectedTags.length}
          </Badge>
        )}
        <ChevronDown className="ml-1 h-3.5 w-3.5" />
      </Button>

      {/* Selected tags as badges */}
      {selectedTagObjects.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              className="gap-1 text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="ml-0.5 rounded-full hover:bg-white/20"
                aria-label={`Filter ${tag.name} entfernen`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border bg-popover shadow-md">
          {allTags.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Keine Tags vorhanden
            </p>
          )}
          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted ${
                  isSelected ? "bg-muted/50 font-medium" : ""
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 text-left">{tag.name}</span>
                {isSelected && (
                  <span className="text-xs text-blue-600">&#10003;</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
