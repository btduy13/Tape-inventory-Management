// Supabase clients for the security suite: service role (test data setup / DB assertions)
// and seed users signed in with password (the attacker / insider view through RLS).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { ANON_KEY, SEED_PASSWORD, SEED_USERS, SERVICE_KEY, SUPABASE_URL, type SeedRole } from "./env";

export type Db = SupabaseClient<Database>;

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

let service: Db | null = null;

/** Service-role client. Use ONLY to create/inspect test data, never as the actor under test. */
export function serviceClient(): Db {
  if (!SERVICE_KEY) throw new Error("[security suite] SUPABASE_SERVICE_ROLE_KEY missing in web/.env.local");
  service ??= createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: NO_SESSION });
  return service;
}

/** Anonymous client (anon key, no session). */
export function anonClient(): Db {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: NO_SESSION });
}

const sessions = new Map<SeedRole, Promise<Db>>();

/** Client signed in as a seed user (password login, local only). Cached per role. */
export function signInAs(role: SeedRole): Promise<Db> {
  let p = sessions.get(role);
  if (!p) {
    p = (async () => {
      const db = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: NO_SESSION });
      const { error } = await db.auth.signInWithPassword({ email: SEED_USERS[role], password: SEED_PASSWORD });
      if (error) throw new Error(`[security suite] sign-in as ${role} failed: ${error.message}`);
      return db;
    })();
    sessions.set(role, p);
  }
  return p;
}
