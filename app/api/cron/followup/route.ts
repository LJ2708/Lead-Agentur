import { NextRequest, NextResponse } from "next/server"
import { processFollowUps } from "@/lib/leads/followup"

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  const { verifyCronAuth } = await import("@/lib/cron/auth")
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await processFollowUps()
    return NextResponse.json({
      ok: true,
      ...stats,
    })
  } catch (err) {
    console.error("[followup-cron] Error:", err)
    return NextResponse.json(
      { error: "Follow-up processing failed" },
      { status: 500 }
    )
  }
}
