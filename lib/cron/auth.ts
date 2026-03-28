import { NextRequest } from "next/server"

/**
 * Verify CRON request authentication.
 * Vercel CRON sends: Authorization: Bearer <CRON_SECRET>
 * Manual calls can send: x-cron-secret header or Authorization: Bearer
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  // Check Authorization: Bearer header (Vercel CRON format)
  const authHeader = request.headers.get("authorization")
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "")
    if (token === cronSecret) return true
  }

  // Check x-cron-secret header (legacy/manual format)
  const xCronSecret = request.headers.get("x-cron-secret")
  if (xCronSecret === cronSecret) return true

  return false
}
