// Next.js 16 Proxy (formerly middleware):
//   1. per-request CSP nonce + Content-Security-Policy header
//   2. Supabase auth session refresh (cookie)
//   3. optimistic redirect of anonymous users away from /portal and /admin
// Real authorization is enforced by RLS + server-side role checks, never here alone.
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, generateNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";
import { isProtectedPath, ROUTES } from "@/lib/routes";

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { response, userId } = await updateSession(request, requestHeaders);

  if (!userId && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.login;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(loginUrl);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Skip static assets, image optimisation and the public API routes. For any matched
      // request with a body, Next.js clones and buffers the body (up to 10 MB) for the proxy
      // BEFORE the route runs, so the routes' early Content-Length / streamed byte caps
      // (lead-intake read-body.ts, quotes respond-route.ts) never acted early, and bodies
      // above 10 MB reached them truncated. The API routes need no session refresh and set
      // their own CSP (withCsp in lib/security/csp.ts).
      source: "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
