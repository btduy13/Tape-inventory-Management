// Logic for POST /api/q/[token]/respond (the app route file only re-exports this).
import "server-only";
import { NextResponse } from "next/server";
import { assertSameOrigin, CsrfError } from "@/lib/security/csrf";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { RESPOND_HTTP_STATUS, respondToQuote, type RespondDeps } from "./respond";
import { createRespondDeps } from "./respond-deps";

const MAX_BODY_BYTES = 8 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: NO_STORE });

/** Reads the body as text, stopping at `max` bytes (req.text() has no limit). Null = too large. */
export async function readTextCapped(req: Request, max: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function handleRespondRequest(
  req: Request,
  rawToken: string,
  deps: () => RespondDeps = createRespondDeps,
): Promise<Response> {
  try {
    assertSameOrigin(req);
  } catch (err) {
    if (err instanceof CsrfError) return json(403, { ok: false, error: "forbidden" });
    throw err;
  }
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(415, { ok: false, error: "unsupported_media_type" });
  }
  if (!(await checkRateLimit(req.headers, RATE_LIMITS.quoteRespond))) {
    return json(429, { ok: false, error: "rate_limited" });
  }

  const text = await readTextCapped(req, MAX_BODY_BYTES);
  if (text === null) return json(413, { ok: false, error: "too_large" });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: "invalid_body" });
  }

  const outcome = await respondToQuote(deps(), rawToken, body);
  if (!outcome.ok) return json(RESPOND_HTTP_STATUS[outcome.error], { ok: false, error: outcome.error });
  return json(200, { ok: true, result: outcome.result });
}
