// CSRF protection for Route Handlers (Server Actions already verify Origin in Next.js).
// Every state-changing route handler (POST/PUT/PATCH/DELETE) must call assertSameOrigin().
// Combined with SameSite=Lax auth cookies this blocks cross-site form/fetch posts.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class CsrfError extends Error {
  readonly status = 403;
  constructor(message = "Cross-site request blocked") {
    super(message);
    this.name = "CsrfError";
  }
}

/** Allowed origins: request host + NEXT_PUBLIC_SITE_URL (custom domain behind a proxy). */
export function allowedOrigins(requestUrl: string, siteUrl?: string): Set<string> {
  const set = new Set<string>([new URL(requestUrl).origin]);
  if (siteUrl) {
    try {
      set.add(new URL(siteUrl).origin);
    } catch {
      /* ignore malformed env */
    }
  }
  return set;
}

export function isSameOriginRequest(req: Request, siteUrl?: string): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

  const allowed = allowedOrigins(req.url, siteUrl);
  const origin = req.headers.get("origin");
  if (origin) return allowed.has(origin);

  // No Origin header (old browsers): fall back to Referer; reject if both missing.
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return allowed.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

export function assertSameOrigin(req: Request): void {
  if (!isSameOriginRequest(req, process.env.NEXT_PUBLIC_SITE_URL)) {
    throw new CsrfError();
  }
}
