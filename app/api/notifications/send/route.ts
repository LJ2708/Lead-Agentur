import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildNotification } from "@/lib/notifications/push"
import type { PushNotification } from "@/lib/notifications/push"

interface SendNotificationBody {
  berater_id: string
  type: PushNotification["type"]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendNotificationBody

    if (!body.berater_id || !body.type) {
      return NextResponse.json(
        { error: "berater_id und type sind erforderlich" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Resolve the profile user_id from berater_id
    const { data: berater, error: beraterError } = await supabase
      .from("berater")
      .select("profile_id")
      .eq("id", body.berater_id)
      .single()

    if (beraterError || !berater) {
      return NextResponse.json(
        { error: "Berater nicht gefunden" },
        { status: 404 }
      )
    }

    const notification = buildNotification(body.type, body.data ?? {})

    const { data: inserted, error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id: berater.profile_id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
        urgency: notification.urgency,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Notification insert error:", insertError)
      return NextResponse.json(
        { error: "Benachrichtigung konnte nicht gespeichert werden" },
        { status: 500 }
      )
    }

    // TODO: Web Push via VAPID keys
    // TODO: Mobile Push via FCM
    // TODO: Email fallback for high-urgency notifications

    return NextResponse.json({ success: true, notification: inserted })
  } catch (err) {
    console.error("Notification send error:", err)
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    )
  }
}
