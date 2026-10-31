// Cookie attributes for the Supabase auth cookie (sb-<ref>-auth-token), shared by the
// server client (server.ts) and the session refresh in the proxy (proxy.ts).
//
//   * httpOnly: @supabase/ssr defaults to httpOnly:false so a browser client can read the
//     session. Here no browser code reads it: the only browser client (Realtime) gets a
//     short-lived access token from getRealtimeAccessToken(). An XSS therefore cannot read
//     the refresh token from document.cookie.
//   * secure: always in a production build (localhost is a secure context, so browsers keep
//     Secure cookies there too). Dev builds over plain http on a LAN IP still work.
//   * sameSite: lax (top-level login redirects and emailed links keep the session).
import type { CookieOptionsWithName } from "@supabase/ssr";

export function authCookieOptions(env: { NODE_ENV?: string } = process.env): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  };
}
