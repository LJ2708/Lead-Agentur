import { createClient } from "@supabase/supabase-js"
import { type Database } from "@/types/database"

/**
 * Supabase admin client with service role privileges.
 * Use only in server-side contexts: webhooks, cron jobs, and API routes
 * that require elevated permissions bypassing RLS.
 *
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    )
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
