"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { uploadCreativeFile } from "@/lib/storage/upload"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  ExternalLink,
  CheckCircle2,
  XCircle,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { extractAdId } from "@/lib/ads/facebook-fetcher"
import type { FacebookAdInfo } from "@/lib/ads/facebook-fetcher"
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

function isFacebookAdUrl(url: string): boolean {
  return /facebook\.com\/ads\/library\/?\?/.test(url) && extractAdId(url) !== null
}

async function fetchAdFromApi(url: string): Promise<{ data?: FacebookAdInfo; error?: string }> {
  const res = await fetch("/api/ads/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  })
  const json = await res.json()
  if (!res.ok) {
    return { error: json.error ?? "Unbekannter Fehler" }
  }
  return { data: json.data }
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
// Single Ad Fetch Section
// ---------------------------------------------------------------------------

function SingleAdFetchSection({
  creatives,
  onSaved,
}: {
  creatives: AdCreative[]
  onSaved: () => void
}) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchedInfo, setFetchedInfo] = useState<FacebookAdInfo | null>(null)
  const [selectedCreativeId, setSelectedCreativeId] = useState<string>("")
  const [saving, setSaving] = useState(false)

  const detectedAdId = url ? extractAdId(url) : null

  const handleFetch = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setFetchedInfo(null)

    const result = await fetchAdFromApi(url.trim())
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setFetchedInfo(result.data)
      // Auto-match: find a creative whose name matches the title
      if (result.data.title) {
        const titleLower = result.data.title.toLowerCase()
        const match = creatives.find(
          (c) =>
            c.name.toLowerCase().includes(titleLower) ||
            titleLower.includes(c.name.toLowerCase())
        )
        if (match) {
          setSelectedCreativeId(match.id)
        }
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!selectedCreativeId || !fetchedInfo) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const updateData: Record<string, string | null> = {
      facebook_ad_id: fetchedInfo.adId,
      facebook_url: fetchedInfo.pageUrl,
    }

    if (fetchedInfo.imageUrl) {
      updateData.media_url = fetchedInfo.imageUrl
    }
    if (fetchedInfo.description) {
      updateData.ad_text = fetchedInfo.description
    }

    const { error: updateError } = await supabase
      .from("ad_creatives")
      .update(updateData)
      .eq("id", selectedCreativeId)

    if (updateError) {
      setError("Speichern fehlgeschlagen: " + updateError.message)
    } else {
      setUrl("")
      setFetchedInfo(null)
      setSelectedCreativeId("")
      onSaved()
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5" />
          Werbeanzeige verkn\u00FCpfen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Facebook Ad Library URL einf\u00FCgen..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
                setFetchedInfo(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFetch()
              }}
            />
            {detectedAdId && (
              <p className="mt-1 text-xs text-muted-foreground">
                Erkannte Ad-ID: <span className="font-mono">{detectedAdId}</span>
              </p>
            )}
          </div>
          <Button
            onClick={handleFetch}
            disabled={loading || !url.trim() || !detectedAdId}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-1.5 h-4 w-4" />
            )}
            Laden
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {fetchedInfo && (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Vorschau der geladenen Daten:</p>
            <div className="flex gap-4">
              {fetchedInfo.imageUrl ? (
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fetchedInfo.imageUrl}
                    alt="Anzeigenvorschau"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border bg-muted/20">
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                {fetchedInfo.title && (
                  <p className="truncate text-sm font-semibold">{fetchedInfo.title}</p>
                )}
                {fetchedInfo.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {fetchedInfo.description}
                  </p>
                )}
                {fetchedInfo.pageName && (
                  <p className="text-xs text-muted-foreground">
                    Seite: {fetchedInfo.pageName}
                  </p>
                )}
                <p className="font-mono text-xs text-muted-foreground">
                  Ad-ID: {fetchedInfo.adId}
                </p>
                {!fetchedInfo.imageUrl && !fetchedInfo.title && (
                  <p className="text-xs text-amber-600">
                    Konnte nicht automatisch geladen werden. Bitte Bild manuell hochladen.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Creative zuordnen</Label>
              <Select value={selectedCreativeId} onValueChange={setSelectedCreativeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Creative ausw\u00E4hlen..." />
                </SelectTrigger>
                <SelectContent>
                  {creatives.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || !selectedCreativeId}
              >
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Bulk Import Section
// ---------------------------------------------------------------------------

interface BulkResult {
  url: string
  status: "success" | "error"
  info: FacebookAdInfo | null
  error?: string
  assignedCreativeId?: string
}

function BulkImportSection({
  creatives,
  onSaved,
}: {
  creatives: AdCreative[]
  onSaved: () => void
}) {
  const [urlsText, setUrlsText] = useState("")
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<BulkResult[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [saving, setSaving] = useState(false)

  const handleBulkFetch = async () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && isFacebookAdUrl(u))

    if (urls.length === 0) return

    setProcessing(true)
    setResults([])
    setProgress({ current: 0, total: urls.length })

    const newResults: BulkResult[] = []

    for (let i = 0; i < urls.length; i++) {
      setProgress({ current: i + 1, total: urls.length })
      const result = await fetchAdFromApi(urls[i])

      let assignedCreativeId: string | undefined
      // Auto-match by title
      if (result.data?.title) {
        const titleLower = result.data.title.toLowerCase()
        const match = creatives.find(
          (c) =>
            c.name.toLowerCase().includes(titleLower) ||
            titleLower.includes(c.name.toLowerCase())
        )
        if (match) assignedCreativeId = match.id
      }

      newResults.push({
        url: urls[i],
        status: result.error ? "error" : "success",
        info: result.data ?? null,
        error: result.error,
        assignedCreativeId,
      })
    }

    setResults(newResults)
    setProcessing(false)
  }

  const updateAssignment = (index: number, creativeId: string) => {
    setResults((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], assignedCreativeId: creativeId }
      return updated
    })
  }

  const handleBulkSave = async () => {
    const toSave = results.filter(
      (r) => r.status === "success" && r.info && r.assignedCreativeId
    )
    if (toSave.length === 0) return

    setSaving(true)
    const supabase = createClient()

    for (const item of toSave) {
      if (!item.info || !item.assignedCreativeId) continue

      const updateData: Record<string, string | null> = {
        facebook_ad_id: item.info.adId,
        facebook_url: item.info.pageUrl,
      }
      if (item.info.imageUrl) {
        updateData.media_url = item.info.imageUrl
      }
      if (item.info.description) {
        updateData.ad_text = item.info.description
      }

      await supabase
        .from("ad_creatives")
        .update(updateData)
        .eq("id", item.assignedCreativeId)
    }

    setSaving(false)
    setResults([])
    setUrlsText("")
    onSaved()
  }

  const successCount = results.filter((r) => r.status === "success").length
  const assignedCount = results.filter((r) => r.assignedCreativeId).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileUp className="h-5 w-5" />
          Massenimport
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>URLs einf\u00FCgen (eine pro Zeile)</Label>
          <Textarea
            placeholder={"https://www.facebook.com/ads/library/?id=...\nhttps://www.facebook.com/ads/library/?id=..."}
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            rows={4}
            disabled={processing}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleBulkFetch}
            disabled={processing || !urlsText.trim()}
          >
            {processing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-1.5 h-4 w-4" />
            )}
            Alle laden
          </Button>
          {processing && (
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total} verarbeitet...
            </span>
          )}
        </div>

        {/* Progress bar */}
        {processing && progress.total > 0 && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Results table */}
        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {successCount} von {results.length} erfolgreich geladen
              {assignedCount > 0 && ` \u2014 ${assignedCount} zugeordnet`}
            </p>

            <div className="max-h-[400px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Vorschau</TableHead>
                    <TableHead>Ad-ID</TableHead>
                    <TableHead>Zuordnung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {result.info?.imageUrl ? (
                          <div className="h-10 w-10 overflow-hidden rounded border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={result.info.imageUrl}
                              alt="Vorschau"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : result.status === "error" ? (
                          <span className="text-xs text-red-500">Fehler</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Kein Bild</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">
                          {result.info?.adId ?? extractAdId(result.url) ?? "\u2014"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {result.status === "success" ? (
                          <Select
                            value={result.assignedCreativeId ?? ""}
                            onValueChange={(val) => updateAssignment(index, val)}
                          >
                            <SelectTrigger className="h-8 w-48 text-xs">
                              <SelectValue placeholder="Zuordnen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {creatives.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-red-500">
                            {result.error ?? "Fehler"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleBulkSave}
                disabled={saving || assignedCount === 0}
              >
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {assignedCount} Zuordnung{assignedCount !== 1 ? "en" : ""} speichern
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
  const [facebookUrl, setFacebookUrl] = useState(creative.facebook_url ?? "")
  const [adText, setAdText] = useState(creative.ad_text ?? "")
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fbFetching, setFbFetching] = useState(false)
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
    setFacebookUrl(creative.facebook_url ?? "")
    setAdText(creative.ad_text ?? "")
    setPreviewUrl(creative.media_url ?? null)
    setUploadedFile(null)
    setError(null)
  }, [creative])

  const handleFacebookUrlBlur = async () => {
    const trimmed = facebookUrl.trim()
    if (!trimmed || !isFacebookAdUrl(trimmed)) return

    setFbFetching(true)
    const result = await fetchAdFromApi(trimmed)
    setFbFetching(false)

    if (result.data) {
      if (result.data.imageUrl && !mediaUrl) {
        setMediaUrl(result.data.imageUrl)
        setPreviewUrl(result.data.imageUrl)
      }
      if (result.data.description && !adText) {
        setAdText(result.data.description)
      }
      if (result.data.title && !description) {
        setDescription(result.data.title)
      }
    }
  }

  const handleFileSelect = useCallback(
    (file: File) => {
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError("Datei zu gro\u00DF (max. 5 MB)")
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

      const fbAdId = facebookUrl ? extractAdId(facebookUrl) : null

      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("ad_creatives")
        .update({
          description: description || null,
          media_type: mediaType,
          media_url: finalMediaUrl || null,
          thumbnail_url: thumbnailUrl || null,
          supabase_path: uploadMode === "file" && uploadedFile ? `creatives/${uploadedFile.name}` : creative.supabase_path,
          facebook_url: facebookUrl || null,
          facebook_ad_id: fbAdId,
          ad_text: adText || null,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creative bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name (read-only) */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={creative.name} readOnly className="bg-muted/50" />
          </div>

          {/* Facebook Ad Library URL */}
          <div className="space-y-1.5">
            <Label htmlFor="facebook-url">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Facebook Ad Library URL
              </span>
            </Label>
            <div className="relative">
              <Input
                id="facebook-url"
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                onBlur={handleFacebookUrlBlur}
                placeholder="https://www.facebook.com/ads/library/?id=..."
              />
              {fbFetching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {facebookUrl && extractAdId(facebookUrl) && (
              <p className="text-xs text-muted-foreground">
                Ad-ID: <span className="font-mono">{extractAdId(facebookUrl)}</span>
              </p>
            )}
          </div>

          {/* Ad Text */}
          <div className="space-y-1.5">
            <Label htmlFor="ad-text">Anzeigentext (optional)</Label>
            <Textarea
              id="ad-text"
              value={adText}
              onChange={(e) => setAdText(e.target.value)}
              placeholder="Text der Facebook-Anzeige..."
              rows={2}
            />
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
                  Datei ausw\u00E4hlen
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
                  Ausgew\u00E4hlt: {uploadedFile.name}
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
                    // Google Drive
                    const driveMatch = previewUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
                    if (driveMatch) {
                      return (
                        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                          <iframe
                            src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
                            title="Vorschau"
                            allow="autoplay; encrypted-media"
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
                    src={(() => {
                      const dm = previewUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
                      return dm ? `https://drive.google.com/thumbnail?id=${dm[1]}&sz=w800` : previewUrl
                    })()}
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

      {/* Single Ad Fetch */}
      <SingleAdFetchSection creatives={creatives} onSaved={handleSaved} />

      {/* Bulk Import */}
      <BulkImportSection creatives={creatives} onSaved={handleSaved} />

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
                  <div className="flex shrink-0 items-center gap-1.5">
                    {creative.facebook_ad_id && (
                      <Badge variant="outline" className="text-[10px]">
                        <Globe className="mr-1 h-3 w-3" />
                        FB
                      </Badge>
                    )}
                    <Badge
                      variant={creative.media_type === "video" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {creative.media_type === "video" ? "Video" : "Bild"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{creative.leads_count} Leads</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {creative.facebook_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a
                          href={creative.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="In Ad Library \u00F6ffnen"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
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
