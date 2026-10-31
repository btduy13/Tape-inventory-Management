// HTML escaping for user-controlled content in email templates.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
  "=": "&#61;",
};

/** Escape text for HTML element content AND quoted attribute values. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"'`=]/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Escape, then turn line breaks into <br> (for multi-line notes). */
export function escapeMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");
}

/**
 * Allow only absolute http(s) URLs (or cid: for inline images) inside href/src.
 * Returns null for anything else (javascript:, data:, relative, malformed).
 */
export function safeUrl(value: string | null | undefined, opts: { allowCid?: boolean } = {}): string | null {
  if (!value) return null;
  if (opts.allowCid && /^cid:[A-Za-z0-9._@-]{1,100}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Strip CR/LF and control chars so user content can never inject headers via subject. */
export function oneLine(value: unknown, max = 150): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, max);
}
