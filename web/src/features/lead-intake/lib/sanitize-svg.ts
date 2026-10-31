// SVG sanitizer for customer logos. Output is stored and later rendered by staff/emails,
// so scripts, event handlers, foreignObject, <style> and external references are removed.
import DOMPurify from "isomorphic-dompurify";

const SANITIZE_OPTIONS = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ["script", "foreignObject", "style", "iframe", "object", "embed", "a"],
  FORBID_ATTR: ["style"],
  // DOMPurify tests EVERY non-URI-safe attribute value against this regexp. Allow internal
  // references (#id) and plain values without ":" or "/" (numbers, path data, colors), so no
  // value can carry a scheme or path (http:, javascript:, //host). data: URIs on <image>
  // pass DOMPurify's DATA_URI_TAGS; dropRasterOnlyDataUris then keeps only PNG/JPEG ones.
  ALLOWED_URI_REGEXP: /^(?:#[\w.:-]*|[^:/]*)$/i,
  KEEP_CONTENT: false,
};

/** External CSS/URL references that survive as presentation attributes (fill="url(http…)"). */
const EXTERNAL_URL = /url\(\s*['"]?\s*(?!#)[^)]*\)/gi;

/** Raster images only: a nested SVG (data:image/svg+xml) or any other data: type is removed. */
const RASTER_DATA_URI = /^data:image\/(?:png|jpeg);base64,[a-z0-9+/=\s]*$/i;

interface AttrHookData {
  attrName: string;
  attrValue: string;
  keepAttr: boolean;
}

function dropNonRasterDataUris(_node: Element, data: AttrHookData): void {
  const name = data.attrName.toLowerCase();
  if (name !== "href" && name !== "xlink:href") return;
  const value = data.attrValue.trim();
  if (/^data:/i.test(value) && !RASTER_DATA_URI.test(value)) data.keepAttr = false;
}

function purify(input: string): string {
  // Scoped hook: added and removed around this synchronous call only.
  DOMPurify.addHook("uponSanitizeAttribute", dropNonRasterDataUris as never);
  try {
    return DOMPurify.sanitize(input, SANITIZE_OPTIONS);
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute", dropNonRasterDataUris as never);
  }
}

/**
 * Returns sanitized SVG markup, or null if nothing safe is left / the root is not <svg>.
 * Callers must reject the upload on null.
 */
export function sanitizeSvg(input: string): string | null {
  if (!input || input.length > 5 * 1024 * 1024) return null;
  const clean = purify(input);
  const out = clean.replace(EXTERNAL_URL, "none").trim();
  if (!/^<svg[\s>]/i.test(out) || !/<\/svg>$/i.test(out)) return null;
  return out;
}
