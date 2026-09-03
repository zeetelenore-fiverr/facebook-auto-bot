import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server-only Supabase client using the service-role key.
 * This is a single-admin-user app: there is no per-request Supabase Auth
 * session, so every server route talks to Postgres with the service role
 * and access is instead gated by the signed admin cookie (see lib/auth).
 * NEVER import this file from a Client Component.
 */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
