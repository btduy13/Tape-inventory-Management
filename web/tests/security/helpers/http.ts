// HTTP helpers against the running web app (BASE_URL).
import { randomBytes } from "node:crypto";
import { BASE_ORIGIN, BASE_URL } from "./env";
import { resetLocalRateLimits } from "./rate-limits";

/**
 * Random private client IP. The live `next start` has no trusted proxy and ignores it (all
 * local requests share one bucket, cleared by resetLocalRateLimits before each call); the
 * in-process intake helpers run with TRUSTED_PROXY=x-real-ip, where it is the client IP.
 */
export function randomIp(): string {
  const b = randomBytes(3);
  return `10.${b[0]}.${b[1]}.${b[2]! || 1}`;
}

export interface HttpOptions {
  /** Origin header. Default: the app's own origin. `null` = send no Origin header. */
  origin?: string | null;
  headers?: Record<string, string>;
  /** Client IP (x-real-ip). Default: random. */
  ip?: string;
}

function baseHeaders(opts: HttpOptions): Record<string, string> {
  const h: Record<string, string> = { "x-real-ip": opts.ip ?? randomIp() };
  const origin = opts.origin === undefined ? BASE_ORIGIN : opts.origin;
  if (origin !== null) h.origin = origin;
  return { ...h, ...opts.headers };
}

export async function postJson(
  path: string,
  body: unknown,
  opts: HttpOptions = {},
): Promise<{ status: number; text: string; json: unknown; headers: Headers }> {
  await resetLocalRateLimits();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...baseHeaders(opts) },
    body: typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, text, json, headers: res.headers };
}

export async function postRaw(path: string, init: RequestInit & { duplex?: "half" }, opts: HttpOptions = {}) {
  await resetLocalRateLimits();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    redirect: "manual",
    ...init,
    headers: { ...baseHeaders(opts), ...(init.headers as Record<string, string> | undefined) },
  } as RequestInit);
  return { status: res.status, text: await res.text(), headers: res.headers };
}

export async function getPage(path: string, opts: HttpOptions = {}) {
  await resetLocalRateLimits();
  const res = await fetch(`${BASE_URL}${path}`, { headers: baseHeaders({ ...opts, origin: null }), redirect: "manual" });
  return { status: res.status, html: await res.text(), headers: res.headers };
}

/** Visible text of the <main> element (strips tags/scripts), for content comparisons. */
export function mainText(html: string): string {
  const m = html.match(/<main[\s\S]*?<\/main>/i);
  return (m ? m[0] : "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
