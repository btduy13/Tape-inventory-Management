// SERVICE ROLE client: bypasses RLS. Server-only (build fails if imported client-side).
// Use ONLY for: public lead intake inserts, storage uploads, quote token lookups,
// rate limiting, sending notifications, admin user management (auth.admin.*).
// Always validate input with zod and check the caller's role BEFORE using it.
import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

let adminClient: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (adminClient) return adminClient;
  adminClient = createSupabaseClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  return adminClient;
}
