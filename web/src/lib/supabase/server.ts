// Server Supabase client for Server Components, Server Actions and Route Handlers.
// Acts AS THE LOGGED-IN USER (anon key + session cookie) so RLS applies.
import "server-only";
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
 * Current user + profile, verified with the Auth server (getUser, not getSession).
 * Returns null when not logged in or profile inactive.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (!data || !data.is_active) return null;
  return data;
}
