"use client"

import { useEffect, useState, useRef, useCallback, Fragment } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  description: string | null
  created_by: string | null
  created_at: string
  authorName: string
}

interface UserOption {
  id: string
  full_name: string
}

interface LeadCommentsProps {
  leadId: string
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatTimestamp(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return "gerade eben"
  if (diffMin < 60) return `vor ${diffMin} Min.`

  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `vor ${diffH} Std.`

  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Renders text with @mentions highlighted */
function CommentText({ text }: { text: string }) {
  const parts = text.split(/(@\w[\w\s]*?\b)/g)

  return (
    <p className="whitespace-pre-wrap text-sm">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className="rounded bg-blue-100 px-1 py-0.5 text-xs font-medium text-blue-700"
          >
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </p>
  )
}

export function LeadComments({ leadId }: LeadCommentsProps) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Mention autocomplete state
  const [users, setUsers] = useState<UserOption[]>([])
  const [mentionSearch, setMentionSearch] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("lead_activities")
      .select("id, description, created_by, created_at, profiles:created_by(full_name)")
      .eq("lead_id", leadId)
      .eq("type", "notiz")
      .order("created_at", { ascending: true })

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Comment[] = data.map((d: any) => ({
        id: d.id,
        description: d.description,
        created_by: d.created_by,
        created_at: d.created_at,
        authorName: d.profiles?.full_name ?? "Unbekannt",
      }))
      setComments(mapped)
    }
  }, [leadId, supabase])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      // Load users for mentions
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")

      if (profilesData) {
        setUsers(profilesData.map((p) => ({ id: p.id, full_name: p.full_name })))
      }

      await fetchComments()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`lead_comments_${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_activities",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as { type: string }).type === "notiz") {
            fetchComments().then(scrollToBottom)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, supabase, fetchComments, scrollToBottom])

  // Auto-scroll when comments change
  useEffect(() => {
    scrollToBottom()
  }, [comments, scrollToBottom])

  // Detect "@" in text for mention autocomplete
  function handleTextChange(value: string) {
    setText(value)

    const cursorPos = textareaRef.current?.selectionStart ?? value.length
    const beforeCursor = value.slice(0, cursorPos)
    const atMatch = beforeCursor.match(/@(\w*)$/)
    if (atMatch) {
      setMentionSearch(atMatch[1].toLowerCase())
      setMentionIndex(0)
    } else {
      setMentionSearch(null)
    }
  }

  const filteredUsers =
    mentionSearch !== null
      ? users.filter((u) => u.full_name.toLowerCase().includes(mentionSearch))
      : []

  function insertMention(user: UserOption) {
    const cursorPos = textareaRef.current?.selectionStart ?? text.length
    const beforeCursor = text.slice(0, cursorPos)
    const afterCursor = text.slice(cursorPos)
    const replaced = beforeCursor.replace(/@\w*$/, `@${user.full_name} `)
    setText(replaced + afterCursor)
    setMentionSearch(null)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionSearch !== null && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(filteredUsers[mentionIndex])
      } else if (e.key === "Escape") {
        setMentionSearch(null)
      }
      return
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleSubmit() {
    if (!text.trim() || !userId || submitting) return
    setSubmitting(true)

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "notiz" as const,
      title: "Notiz",
      description: text.trim(),
      created_by: userId,
    })

    setText("")
    setMentionSearch(null)
    await fetchComments()
    setSubmitting(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Kommentare {comments.length > 0 && `(${comments.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Comments list */}
        <div
          ref={scrollRef}
          className="max-h-[400px] space-y-3 overflow-y-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Noch keine Kommentare vorhanden.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {getInitials(comment.authorName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(comment.created_at)}
                    </span>
                  </div>
                  {comment.description && (
                    <CommentText text={comment.description} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="relative">
          {mentionSearch !== null && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-md border bg-card shadow-lg">
              {filteredUsers.slice(0, 6).map((user, idx) => (
                <button
                  key={user.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                    idx === mentionIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(user)
                  }}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {getInitials(user.full_name)}
                  </div>
                  {user.full_name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Kommentar schreiben... (@Name fuer Erwaehnung)"
              rows={2}
              className="min-h-[60px] flex-1 resize-none"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="shrink-0"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
