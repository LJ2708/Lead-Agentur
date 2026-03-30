import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { runBulkImport } from "@/lib/import/bulk-import"
import * as fs from "fs"
import * as path from "path"

export const maxDuration = 300 // 5 minutes for large imports

export async function POST(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    let csvContent: string

    const contentType = req.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await req.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json(
          { error: "Keine CSV-Datei hochgeladen" },
          { status: 400 }
        )
      }

      csvContent = await file.text()
    } else {
      // Handle JSON body with file_path or csv_content
      const body = await req.json()

      if (body.csv_content) {
        csvContent = body.csv_content
      } else if (body.file_path) {
        const filePath = path.resolve(body.file_path)
        if (!fs.existsSync(filePath)) {
          return NextResponse.json(
            { error: `Datei nicht gefunden: ${filePath}` },
            { status: 400 }
          )
        }
        csvContent = fs.readFileSync(filePath, "utf-8")
      } else {
        return NextResponse.json(
          {
            error:
              "Bitte csv_content, file_path im Body oder eine Datei als multipart/form-data senden",
          },
          { status: 400 }
        )
      }
    }

    const logs: string[] = []
    const summary = await runBulkImport(supabase, csvContent, (msg) => {
      logs.push(msg)
    })

    return NextResponse.json({
      success: true,
      summary,
      logs,
    })
  } catch (err) {
    console.error("Bulk import error:", err)
    const message = err instanceof Error ? err.message : "Unbekannter Fehler"
    return NextResponse.json(
      { error: "Import fehlgeschlagen", details: message },
      { status: 500 }
    )
  }
}
