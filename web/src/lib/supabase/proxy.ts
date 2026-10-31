// Session refresh for src/proxy.ts. Keeps the Supabase auth cookie fresh on every request.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types";
import { authCookieOptions } from "./cookie-options";

export interface SessionResult {
  response: NextResponse;
  userId: string | null;
}

/**
 * Refreshes the session cookie and returns the response to continue with.
 * `requestHeaders` lets the caller forward extra headers (e.g. CSP nonce) to the app.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<SessionResult> {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { response, userId: null }; // not configured (e.g. CI build)

  const supabase = createServerClient<Database>(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not put code between createServerClient and getUser (Supabase SSR guidance).
  const { data } = await supabase.auth.getUser();
  return { response, userId: data.user?.id ?? null };
}
