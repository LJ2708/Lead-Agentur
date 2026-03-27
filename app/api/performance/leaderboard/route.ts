import { NextRequest, NextResponse } from "next/server"
import { calculateLeaderboard } from "@/lib/performance/scoring"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") as "today" | "week" | "month" | null

  if (!period || !["today", "week", "month"].includes(period)) {
    return NextResponse.json(
      { error: "period must be today, week, or month" },
      { status: 400 }
    )
  }

  try {
    const result = await calculateLeaderboard(period)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Failed to calculate leaderboard" },
      { status: 500 }
    )
  }
}
