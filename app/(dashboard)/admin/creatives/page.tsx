"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { uploadCreativeFile } from "@/lib/storage/upload"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Image as ImageIcon,
  Video,
  Upload,
  Pencil,
  ImageOff,
  Loader2,
  Play,
  Link as LinkIcon,
  FileUp,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tables } from "@/types/database"

type AdCreative = Tables<"ad_creatives">

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

// ---------------------------------------------------------------------------
// Media Preview inside card
// ---------------------------------------------------------------------------

function CardMediaPreview({ creative }: { creative: AdCreative }) {
  const url = creative.media_url

  if (!url) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-t-lg bg-muted/40 text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-8 w-8" />
          <span className="text-xs">Kein Creative hinterlegt</span>
        </div>
      </div>
    )
  }

  if (creative.media_type === "video") {
    const ytId = getYouTubeId(url)
    if (ytId) {
      const thumbUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
      return (
        <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl}
            alt={creative.name}
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="h-5 w-5 fill-black text-black" />
            </div>
          </div>
        </div>
      )
    }

    // Direct video / thumbnail
    const poster = creative.thumbnail_url ?? undefined
    return (
      <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-black">
        {poster ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster}
              alt={creative.name}
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="h-5 w-5 fill-black text-black" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            <Video className="h-10 w-10" />
          </div>
        )}
      </div>
    )
  }

  // Image
  return (
    <div className="h-48 w-full overflow-hidden rounded-t-lg bg-muted/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={creative.name}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload / Edit Dialog
// ---------------------------------------------------------------------------

function EditCreativeDialog({
  creative,
  open,
  onClose,
  onSaved,
}: {
  creative: AdCreative
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [description, setDescription] = useState(creative.description ?? "")
  const [mediaType, setMediaType] = useState<"image" | "video">(
    (creative.media_type as "image" | "video") ?? "image"
  )
  const [mediaUrl, setMediaUrl] = useState(creative.media_url ?? "")
  const [thumbnailUrl, setThumbnailUrl] = useState(creative.thumbnail_url ?? "")
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(creative.media_url ?? null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync state when creative changes
  useEffect(() => {
    setDescription(creative.description ?? "")
    setMediaType((creative.media_type as "image" | "video") ?? "image")
    setMediaUrl(creative.media_url ?? "")
    setThumbnailUrl(creative.thumbnail_url ?? "")
    setPreviewUrl(creative.media_url ?? null)
    setUploadedFile(null)
    setError(null)
  }, [creative])

  const handleFileSelect = useCallback(
    (file: File) => {
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError("Datei zu groß (max. 5 MB)")
        return
      }

      const validTypes = ["image/jpeg", "image/png", "image/webp"]
      if (!validTypes.includes(file.type)) {
        setError("Nur JPG, PNG oder WebP erlaubt")
        return
      }

      setError(null)
      setUploadedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let finalMediaUrl = mediaUrl

      // If a file was selected, upload it first
      if (uploadMode === "file" && uploadedFile) {
        setUploading(true)
        const publicUrl = await uploadCreativeFile(uploadedFile, creative.name)
        setUploading(false)

        if (!publicUrl) {
          setError("Upload fehlgeschlagen. Bitte erneut versuchen.")
          setSaving(false)
          return
        }
        finalMediaUrl = publicUrl
      }

      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("ad_creatives")
        .update({
          description: description || null,
          media_type: mediaType,
          media_url: finalMediaUrl || null,
          thumbnail_url: thumbnailUrl || null,
          supabase_path: uploadMode === "file" && uploadedFile ? `creatives/${uploadedFile.name}` : creative.supabase_path,
        })
        .eq("id", creative.id)

      if (updateError) {
        setError("Speichern fehlgeschlagen: " + updateError.message)
        setSaving(false)
        return
      }

      onSaved()
      onClose()
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Creative bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name (read-only) */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={creative.name} readOnly className="bg-muted/50" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung der Anzeige..."
              rows={2}
            />
          </div>

          {/* Media Type toggle */}
          <div className="space-y-1.5">
            <Label>Medientyp</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mediaType === "image" ? "default" : "outline"}
                size="sm"
                onClick={() => setMediaType("image")}
              >
                <ImageIcon className="mr-1.5 h-4 w-4" />
                Bild
              </Button>
              <Button
                type="button"
                variant={mediaType === "video" ? "default" : "outline"}
                size="sm"
                onClick={() => setMediaType("video")}
              >
                <Video className="mr-1.5 h-4 w-4" />
                Video
              </Button>
            </div>
          </div>

          {/* Upload mode toggle */}
          <div className="space-y-1.5">
            <Label>Quelle</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={uploadMode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMode("url")}
              >
                <LinkIcon className="mr-1.5 h-4 w-4" />
                URL eingeben
              </Button>
              {mediaType === "image" && (
                <Button
                  type="button"
                  variant={uploadMode === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUploadMode("file")}
                >
                  <FileUp className="mr-1.5 h-4 w-4" />
                  Datei hochladen
                </Button>
              )}
            </div>
          </div>

          {/* URL input */}
          {uploadMode === "url" && (
            <div className="space-y-1.5">
              <Label htmlFor="media-url">
                {mediaType === "video" ? "Video-URL (YouTube, direkt)" : "Bild-URL"}
              </Label>
              <Input
                id="media-url"
                type="url"
                value={mediaUrl}
                onChange={(e) => {
                  setMediaUrl(e.target.value)
                  setPreviewUrl(e.target.value || null)
                }}
                placeholder={
                  mediaType === "video"
                    ? "https://youtube.com/watch?v=..."
                    : "https://example.com/bild.jpg"
                }
              />
              {mediaType === "video" && (
                <div className="space-y-1.5">
                  <Label htmlFor="thumbnail-url">Thumbnail-URL (optional)</Label>
                  <Input
                    id="thumbnail-url"
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>
              )}
            </div>
          )}

          {/* File upload */}
          {uploadMode === "file" && mediaType === "image" && (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors",
                "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                Bild hierher ziehen oder{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Datei auswählen
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP — max. 5 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />
              {uploadedFile && (
                <p className="mt-1 text-xs font-medium text-green-600">
                  Ausgewählt: {uploadedFile.name}
                </p>
              )}
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-1.5">
              <Label>Vorschau</Label>
              <div className="overflow-hidden rounded-lg border bg-muted/20">
                {mediaType === "video" ? (
                  (() => {
                    const ytId = getYouTubeId(previewUrl)
                    if (ytId) {
                      return (
                        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                            title="Vorschau"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 h-full w-full"
                          />
                        </div>
                      )
                    }
                    return (
                      <video
                        src={previewUrl}
                        controls
                        className="max-h-48 w-full"
                        poster={thumbnailUrl || undefined}
                      >
                        <track kind="captions" />
                      </video>
                    )
                  })()
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Vorschau"
                    className="max-h-48 w-full object-contain"
                  />
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Save */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminCreativesPage() {
  const [creatives, setCreatives] = useState<AdCreative[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editCreative, setEditCreative] = useState<AdCreative | null>(null)

  const syncCreativesFromLeads = useCallback(async () => {
    setSyncing(true)
    const supabase = createClient()

    // Get all unique ad_name values from leads
    const { data: leadsData } = await supabase
      .from("leads")
      .select("ad_name")

    if (!leadsData) {
      setSyncing(false)
      return
    }

    // Count leads per ad_name
    const countMap = new Map<string, number>()
    for (const lead of leadsData) {
      const name = lead.ad_name
      if (name) {
        countMap.set(name, (countMap.get(name) ?? 0) + 1)
      }
    }

    if (countMap.size === 0) {
      setSyncing(false)
      return
    }

    // Get existing creative names
    const { data: existingCreatives } = await supabase
      .from("ad_creatives")
      .select("name")

    const existingNames = new Set((existingCreatives ?? []).map((c) => c.name))

    // Insert new creatives
    const entries = Array.from(countMap.entries())
    const newCreatives = entries
      .filter(([name]) => !existingNames.has(name))
      .map(([name, count]) => ({
        name,
        leads_count: count,
      }))

    if (newCreatives.length > 0) {
      await supabase.from("ad_creatives").insert(newCreatives)
    }

    // Update leads_count for existing ones
    for (let i = 0; i < entries.length; i++) {
      const [name, count] = entries[i]
      if (existingNames.has(name)) {
        await supabase
          .from("ad_creatives")
          .update({ leads_count: count })
          .eq("name", name)
      }
    }

    setSyncing(false)
  }, [])

  const fetchCreatives = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("ad_creatives")
      .select("*")
      .order("leads_count", { ascending: false })

    setCreatives(data ?? [])
    setLoading(false)
  }, [])

  // On mount: sync from leads, then fetch
  useEffect(() => {
    let cancelled = false

    async function init() {
      await syncCreativesFromLeads()
      if (!cancelled) {
        await fetchCreatives()
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [syncCreativesFromLeads, fetchCreatives])

  const handleSaved = useCallback(() => {
    fetchCreatives()
  }, [fetchCreatives])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Werbeanzeigen</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 rounded-t-lg bg-muted/40" />
              <CardContent className="p-4">
                <div className="h-4 w-3/4 rounded bg-muted/40" />
                <div className="mt-2 h-3 w-1/2 rounded bg-muted/40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Werbeanzeigen</h1>
          <Badge variant="secondary" className="text-sm">
            {creatives.length}
          </Badge>
          {syncing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Synchronisiere...
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {creatives.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <ImageOff className="h-12 w-12" />
            <p className="text-lg font-medium">Keine Werbeanzeigen gefunden</p>
            <p className="text-sm">
              Werbeanzeigen werden automatisch aus Lead-Daten erstellt.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creatives.map((creative) => (
            <Card key={creative.id} className="overflow-hidden transition-shadow hover:shadow-md">
              {/* Media preview */}
              <CardMediaPreview creative={creative} />

              {/* Card body */}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" title={creative.name}>
                      {creative.name}
                    </p>
                    {creative.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {creative.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={creative.media_type === "video" ? "default" : "secondary"}
                    className="shrink-0 text-[10px]"
                  >
                    {creative.media_type === "video" ? "Video" : "Bild"}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{creative.leads_count} Leads</span>
                  </div>

                  <Button
                    type="button"
                    variant={creative.media_url ? "outline" : "default"}
                    size="sm"
                    onClick={() => setEditCreative(creative)}
                  >
                    {creative.media_url ? (
                      <>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Bearbeiten
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Medien hochladen
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editCreative && (
        <EditCreativeDialog
          creative={editCreative}
          open={!!editCreative}
          onClose={() => setEditCreative(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
