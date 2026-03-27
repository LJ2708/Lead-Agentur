import { NextRequest, NextResponse } from "next/server"
import { calculateRepPerformance } from "@/lib/performance/scoring"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const beraterId = searchParams.get("beraterId")
  const period = searchParams.get("period") as "today" | "week" | "month" | null

  if (!beraterId || !period) {
    return NextResponse.json(
      { error: "beraterId and period are required" },
      { status: 400 }
    )
  }

  if (!["today", "week", "month"].includes(period)) {
    return NextResponse.json(
      { error: "period must be today, week, or month" },
      { status: 400 }
    )
  }

  try {
    const result = await calculateRepPerformance(beraterId, period)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Failed to calculate performance" },
      { status: 500 }
    )
  }
}
