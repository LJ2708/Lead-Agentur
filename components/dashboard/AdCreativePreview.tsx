"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { ImageOff, Play, X } from "lucide-react"
import type { Tables } from "@/types/database"

type AdCreative = Tables<"ad_creatives">

interface AdCreativePreviewProps {
  adName: string | null
  compact?: boolean
}

// Simple in-memory cache for creative data
const creativeCache = new Map<string, AdCreative | null>()

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

function MediaDisplay({
  creative,
  maxHeight,
}: {
  creative: AdCreative
  maxHeight: string
}) {
  const mediaUrl = creative.media_url

  if (!mediaUrl) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
        <ImageOff className="mr-1.5 h-4 w-4" />
        Kein Creative
      </div>
    )
  }

  // Video: YouTube
  if (creative.media_type === "video") {
    const ytId = getYouTubeId(mediaUrl)
    if (ytId) {
      return (
        <div className="relative w-full overflow-hidden rounded-lg" style={{ maxHeight }}>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}`}
              title={creative.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full rounded-lg"
            />
          </div>
        </div>
      )
    }

    // Video: direct URL
    return (
      <div className="relative w-full overflow-hidden rounded-lg" style={{ maxHeight }}>
        <video
          src={mediaUrl}
          controls
          className="w-full rounded-lg object-contain"
          style={{ maxHeight }}
          poster={creative.thumbnail_url ?? undefined}
        >
          <track kind="captions" />
        </video>
      </div>
    )
  }

  // Image
  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ maxHeight }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl}
        alt={creative.name}
        className="w-full rounded-lg object-contain"
        style={{ maxHeight }}
      />
    </div>
  )
}

function CompactThumbnail({
  creative,
  onClick,
}: {
  creative: AdCreative
  onClick: () => void
}) {
  const mediaUrl = creative.media_url ?? creative.thumbnail_url

  if (!mediaUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground"
        title={creative.name}
      >
        <ImageOff className="h-4 w-4" />
      </button>
    )
  }

  const isVideo = creative.media_type === "video"
  const ytId = isVideo ? getYouTubeId(mediaUrl) : null
  const thumbSrc = creative.thumbnail_url ?? (ytId ? `https://img.youtube.com/vi/${ytId}/default.jpg` : mediaUrl)

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/30"
      title={creative.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbSrc}
        alt={creative.name}
        className="h-full w-full object-cover"
      />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="h-3 w-3 fill-white text-white" />
        </div>
      )}
    </button>
  )
}

function FullPreviewModal({
  creative,
  onClose,
}: {
  creative: AdCreative
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Vorschau: ${creative.name}`}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-xl bg-card p-4 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-muted p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="mb-3 text-sm font-semibold">{creative.name}</p>
        <MediaDisplay creative={creative} maxHeight="70vh" />
      </div>
    </div>
  )
}

export function AdCreativePreview({ adName, compact }: AdCreativePreviewProps) {
  const [creative, setCreative] = useState<AdCreative | null | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)

  const fetchCreative = useCallback(async () => {
    if (!adName) {
      setCreative(null)
      return
    }

    // Check cache first
    if (creativeCache.has(adName)) {
      setCreative(creativeCache.get(adName) ?? null)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from("ad_creatives")
      .select("*")
      .eq("name", adName)
      .maybeSingle()

    creativeCache.set(adName, data ?? null)
    setCreative(data ?? null)
  }, [adName])

  useEffect(() => {
    fetchCreative()
  }, [fetchCreative])

  // Loading
  if (creative === undefined) {
    return (
      <div className={cn("animate-pulse rounded-lg bg-muted/40", compact ? "h-10 w-10" : "h-20 w-full")} />
    )
  }

  // No creative record or no media
  if (!creative || !creative.media_url) {
    if (compact) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/40 text-[9px] text-muted-foreground">
          <ImageOff className="h-3.5 w-3.5" />
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        <ImageOff className="h-4 w-4" />
        <span>Kein Creative hinterlegt</span>
      </div>
    )
  }

  // Compact mode
  if (compact) {
    return (
      <>
        <CompactThumbnail creative={creative} onClick={() => setShowModal(true)} />
        {showModal && (
          <FullPreviewModal creative={creative} onClose={() => setShowModal(false)} />
        )}
      </>
    )
  }

  // Full mode
  return (
    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
      <h4 className="mb-2 text-sm font-semibold text-foreground">Werbeanzeige</h4>
      <p className="mb-2 text-sm font-medium">{creative.name}</p>
      <MediaDisplay creative={creative} maxHeight="200px" />
    </div>
  )
}
