// Content-Security-Policy builder. Pure function so it is unit-testable.
// Used by src/proxy.ts for every page request (fresh nonce each time).

export interface CspOptions {
  nonce: string;
  isDev: boolean;
  /** e.g. https://abcd.supabase.co — allowed for fetch, websocket (Realtime) and images. */
  supabaseUrl?: string;
}

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function supabaseOrigins(url?: string): { http: string[]; ws: string[] } {
  if (!url) return { http: [], ws: [] };
  try {
    const u = new URL(url);
    const wsProtocol = u.protocol === "https:" ? "wss:" : "ws:";
    return { http: [u.origin], ws: [`${wsProtocol}//${u.host}`] };
  } catch {
    return { http: [], ws: [] };
  }
}

export function buildCsp({ nonce, isDev, supabaseUrl }: CspOptions): string {
  const sb = supabaseOrigins(supabaseUrl);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      TURNSTILE_ORIGIN,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`],
    "img-src": ["'self'", "blob:", "data:", ...sb.http],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...sb.http, ...sb.ws, ...(isDev ? ["ws:"] : [])],
    "frame-src": [TURNSTILE_ORIGIN],
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
