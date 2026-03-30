import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  fetchFacebookAdInfo,
  extractAdId,
} from "@/lib/ads/facebook-fetcher"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Parse body
  let body: { url: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request Body" },
      { status: 400 }
    )
  }

  const { url } = body

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "URL ist erforderlich" },
      { status: 400 }
    )
  }

  const adId = extractAdId(url)
  if (!adId) {
    return NextResponse.json(
      { error: "Keine gültige Facebook Ad Library URL" },
      { status: 400 }
    )
  }

  const info = await fetchFacebookAdInfo(url)

  if (!info) {
    return NextResponse.json(
      {
        error:
          "Konnte nicht automatisch geladen werden. Bitte Bild manuell hochladen.",
      },
      { status: 422 }
    )
  }

  return NextResponse.json({ data: info })
}
