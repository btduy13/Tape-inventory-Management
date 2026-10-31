// Browser Supabase client (anon key + the user's access token). RLS applies.
// Used for Realtime only. The auth cookie is HttpOnly (cookie-options.ts), so the token
// comes from the getRealtimeAccessToken() Server Action and is cached until shortly before
// it expires. supabase.auth is not available on this client (accessToken mode).
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { publicEnv } from "@/lib/env";
import { getRealtimeAccessToken } from "./realtime-token";

const REFRESH_MARGIN_MS = 60_000;

let browserClient: SupabaseClient<Database> | null = null;
let cached: { token: string | null; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;

function expiryOf(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : Date.now();
  } catch {
    return Date.now();
  }
}

async function accessToken(): Promise<string | null> {
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.token;
  inflight ??= getRealtimeAccessToken()
    .catch(() => null)
    .then((token) => {
      // No session: retry on the next call instead of caching "anonymous" for an hour.
      cached = token ? { token, expiresAt: expiryOf(token) } : null;
      return token;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const env = publicEnv();
  browserClient = createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    accessToken,
  });
  return browserClient;
}
