// GET /auth/callback: exchanges a PKCE code or verifies an email token_hash (invite / recovery),
// then redirects to a safe same-site path. Errors go to /login?error=link.
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { parseCallbackParams } from "../lib/callback";

export async function handleAuthCallback(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const params = parseCallbackParams(url.searchParams);
  const fail = () => {
    const to = new URL(ROUTES.login, url.origin);
    to.searchParams.set("error", "link");
    return NextResponse.redirect(to);
  };

  if (params.kind === "invalid") return fail();

  const db = await createClient();
  const { error } =
    params.kind === "code"
      ? await db.auth.exchangeCodeForSession(params.code)
      : await db.auth.verifyOtp({ token_hash: params.tokenHash, type: params.type });
  if (error) return fail();

  return NextResponse.redirect(new URL(params.next, url.origin));
}
