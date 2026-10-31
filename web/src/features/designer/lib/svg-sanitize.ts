// SVG sanitizer for logo previews (client) and re-validation (server, via lead-intake).
// Strips scripts, event handlers, foreignObject, external references and CSS url() fetches.
import DOMPurify from "isomorphic-dompurify";

const FORBID_TAGS = ["script", "foreignObject", "iframe", "embed", "object", "image", "use", "a", "style", "animate", "set"];
const FORBID_ATTR = ["style", "href", "xlink:href", "src", "action", "formaction"];

/** Returns sanitized SVG markup, or null when nothing usable remains. */
export function sanitizeSvg(markup: string): string | null {
  if (typeof markup !== "string" || markup.length === 0) return null;
  const clean = DOMPurify.sanitize(markup, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  // Belt and braces: drop any remaining url(...) that is not a local fragment reference.
  const noRemote = clean.replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, "none");
  return /^\s*<svg[\s>]/i.test(noRemote) ? noRemote : null;
}
