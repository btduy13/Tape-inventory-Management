// Server Supabase client for Server Components, Server Actions and Route Handlers.
// Acts AS THE LOGGED-IN USER (anon key + session cookie) so RLS applies.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/types";
import { publicEnv } from "@/lib/env";
import { authCookieOptions } from "./cookie-options";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const env = publicEnv();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // Session refresh is handled by src/proxy.ts, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Current user + profile. The JWT is verified with getClaims (signature + expiry, locally with
 * asymmetric signing keys; never getSession, which does not verify). A revoked session stays
 * valid until the access token expires, so the profile row (is_active) and RLS are the gate.
 * Returns null when not logged in or profile inactive.
 * cache(): layout, page and actions in one request share one claims check + profile read.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", auth.claims.sub).maybeSingle();
  if (!data || !data.is_active) return null;
  return data;
});
