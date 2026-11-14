// Browser-side logo intake: validate -> sanitize SVG / re-encode WEBP+GIF to PNG -> object URL -> size
// -> auto clean-up for the preview (white background removed, margins trimmed: logo-clean.ts).
// `file` stays the customer's (sanitized / re-encoded) original: that is what staff receive.
import { CONVERT_MAX_SIDE, MAX_LOGO_BYTES } from "./constants";
import { cleanLogoUrl, type LogoCleaner } from "./logo-clean-dom";
import { checkConvertibleBytes, checkLogoBytes, logoMime } from "./logo-validate";
import { sanitizeSvg } from "./svg-sanitize";
import type { LogoAsset, LogoKind } from "./state";

export type LogoLoadResult = { ok: true; logo: LogoAsset } | { ok: false; error: "tooLarge" | "invalidType" | "empty" | "decode" };

export type ImageSizer = (url: string) => Promise<{ width: number; height: number }>;
/** Re-encodes a decodable image (object URL) to a PNG blob. */
export type PngConverter = (url: string) => Promise<Blob>;

/** Default sizer: decode via HTMLImageElement (img-src blob: is allowed by CSP). */
export const decodeImageSize: ImageSizer = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 150 });
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });

/** Default converter: draw the first frame on a canvas (max CONVERT_MAX_SIDE) and export PNG. */
export const convertToPng: PngConverter = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!(w > 0 && h > 0)) return reject(new Error("decode"));
      const k = Math.min(1, CONVERT_MAX_SIDE / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * k));
      canvas.height = Math.max(1, Math.round(h * k));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("decode"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("decode"))), "image/png");
    };
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });

const baseName = (file: File) => file.name.replace(/\.[^.]*$/, "") || "logo";

async function reencode(file: File, convert: PngConverter): Promise<File | null> {
  const src = URL.createObjectURL(file);
  try {
    const png = await convert(src);
    return new File([png], `${baseName(file)}.png`, { type: logoMime("png") });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(src);
  }
}

export async function loadLogoFile(
  file: File,
  sizer: ImageSizer = decodeImageSize,
  convert: PngConverter = convertToPng,
  clean: LogoCleaner = cleanLogoUrl,
): Promise<LogoLoadResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let out: File = file;
  let kind: LogoKind;

  const check = checkLogoBytes(bytes, file.type, file.size);
  if (check.ok) {
    kind = check.kind;
    if (kind === "svg") {
      const clean = sanitizeSvg(new TextDecoder().decode(bytes));
      if (!clean) return { ok: false, error: "invalidType" };
      out = new File([clean], `${baseName(file)}.svg`, { type: logoMime("svg") });
    }
  } else {
    // PNG/JPG/SVG failed: WEBP and GIF are accepted and re-encoded so the server only sees PNG.
    const conv = checkConvertibleBytes(bytes, file.type, file.size);
    if (!conv.ok) return check.error === "invalidType" ? conv : check;
    const png = await reencode(file, convert);
    if (!png) return { ok: false, error: "decode" };
    if (png.size > MAX_LOGO_BYTES) return { ok: false, error: "tooLarge" };
    out = png;
    kind = "png";
  }

  const url = URL.createObjectURL(out);
  try {
    const size = await sizer(url);
    if (!(size.width > 0 && size.height > 0)) throw new Error("decode");
    const original = { url, width: size.width, height: size.height };
    const cleaned = await clean(url, size.width, size.height).catch(() => null);
    if (!cleaned) return { ok: true, logo: { file: out, kind, ...original, cleaned: false } };
    const { bgRemoved, trimmed, ...shown } = cleaned;
    return { ok: true, logo: { file: out, kind, ...shown, cleaned: true, alt: original, cleanup: { bgRemoved, trimmed } } };
  } catch {
    URL.revokeObjectURL(url);
    return { ok: false, error: "decode" };
  }
}
