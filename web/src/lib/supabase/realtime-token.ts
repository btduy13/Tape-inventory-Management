"use server";
// Short-lived access token for the browser Realtime client (lib/supabase/client.ts).
// The auth cookie is HttpOnly (cookie-options.ts), so browser code cannot read the session.
// Only the access token (JWT, ~1 h) is handed out, never the refresh token.
import "server-only";
import { createClient } from "./server";

export async function getRealtimeAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  // getUser() verifies the session with the Auth server before the token is returned.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
