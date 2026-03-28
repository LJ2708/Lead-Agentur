import { NextRequest, NextResponse } from "next/server"
import { calcGesamtpreis, MIN_LEADS, MAX_LEADS } from "@/lib/pricing/calculator"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const leadsParam = searchParams.get("leads")
  const setterParam = searchParams.get("setter")

  if (!leadsParam) {
    return NextResponse.json(
      { error: "Query-Parameter 'leads' ist erforderlich." },
      { status: 400 }
    )
  }

  const leads = parseInt(leadsParam, 10)
  if (isNaN(leads) || leads < MIN_LEADS || leads > MAX_LEADS) {
    return NextResponse.json(
      {
        error: `'leads' muss eine Zahl zwischen ${MIN_LEADS} und ${MAX_LEADS} sein.`,
      },
      { status: 400 }
    )
  }

  const hatSetter = setterParam === "true" || setterParam === "1"
  const result = calcGesamtpreis(leads, hatSetter)

  return NextResponse.json(result)
}
