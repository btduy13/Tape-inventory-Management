// Open-redirect guard for `?next=` (set by src/proxy.ts on login redirects) and any other
// user-supplied post-action destination. Only same-site relative paths are allowed.

const FALLBACK = "/portal";

/**
 * Returns `next` if it is a safe same-origin path, otherwise `fallback`.
 * Rejects absolute URLs, protocol-relative `//host`, backslash tricks (`/\host`),
 * control characters / whitespace and encoded variants of those.
 */
export function safeNextPath(next: string | null | undefined, fallback: string = FALLBACK): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;

  let decoded = next;
  try {
    // Decode twice to catch double-encoded slashes/backslashes (%252F%252F).
    decoded = decodeURIComponent(decodeURIComponent(next));
  } catch {
    return fallback;
  }

  for (const candidate of [next, decoded]) {
    if (!candidate.startsWith("/")) return fallback;
    if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
    if (candidate.includes("\\")) return fallback;
    if (/[\u0000-\u001f\u007f\s]/.test(candidate)) return fallback;
  }

  // Final check with the URL parser: must stay on the same origin.
  const base = "https://same-origin.invalid";
  try {
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    // The parser removes dot segments, so "/.//host", "/..//host" or "/%2e//host" come back
    // as "//host" (protocol-relative, off-site). Re-check what we would actually return.
    const out = `${url.pathname}${url.search}${url.hash}`;
    if (!out.startsWith("/") || out.startsWith("//") || out.includes("\\")) return fallback;
    if (new URL(out, base).origin !== base) return fallback;
    return out;
  } catch {
    return fallback;
  }
}
