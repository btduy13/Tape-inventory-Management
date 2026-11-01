// Client-side logo checks (UX only; the server re-validates). Type sniffed from bytes, not MIME.
import { MAX_LOGO_BYTES } from "./constants";
import type { LogoKind } from "./state";

export type LogoCheck = { ok: true; kind: LogoKind } | { ok: false; error: "tooLarge" | "invalidType" | "empty" };

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function sniffImageKind(bytes: Uint8Array): LogoKind | null {
  if (PNG_SIG.every((b, i) => bytes[i] === b)) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  // SVG: text starting (after optional BOM / whitespace / XML prolog / comments) with <svg.
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .replace(/^﻿/, "")
    .replace(/<\?xml[\s\S]*?\?>/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .trimStart();
  if (/^<svg[\s>]/i.test(head)) return "svg";
  return null;
}

/** Raster formats the browser can decode that we re-encode to PNG before upload. */
export type ConvertibleKind = "webp" | "gif";

const CONVERTIBLE_MIME: Record<ConvertibleKind, string> = { webp: "image/webp", gif: "image/gif" };

/** WEBP ("RIFF....WEBP") or GIF ("GIF87a"/"GIF89a") by magic bytes. */
export function sniffConvertibleKind(bytes: Uint8Array): ConvertibleKind | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(ascii(0, 6))) return "gif";
  return null;
}

/** Size + type check for WEBP/GIF input (declared MIME must agree when present). */
export function checkConvertibleBytes(
  bytes: Uint8Array,
  declaredMime: string,
  size: number,
): { ok: true; kind: ConvertibleKind } | { ok: false; error: "tooLarge" | "invalidType" | "empty" } {
  if (size <= 0) return { ok: false, error: "empty" };
  if (size > MAX_LOGO_BYTES) return { ok: false, error: "tooLarge" };
  const kind = sniffConvertibleKind(bytes);
  if (!kind) return { ok: false, error: "invalidType" };
  if (declaredMime && declaredMime.toLowerCase() !== CONVERTIBLE_MIME[kind]) return { ok: false, error: "invalidType" };
  return { ok: true, kind };
}

const MIME_BY_KIND: Record<LogoKind, readonly string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg", "image/jpg"],
  svg: ["image/svg+xml"],
};

/** Validate size, sniffed type and declared MIME (both must agree when MIME is present). */
export function checkLogoBytes(bytes: Uint8Array, declaredMime: string, size: number): LogoCheck {
  if (size <= 0) return { ok: false, error: "empty" };
  if (size > MAX_LOGO_BYTES) return { ok: false, error: "tooLarge" };
  const kind = sniffImageKind(bytes);
  if (!kind) return { ok: false, error: "invalidType" };
  if (declaredMime && !MIME_BY_KIND[kind].includes(declaredMime.toLowerCase())) {
    return { ok: false, error: "invalidType" };
  }
  return { ok: true, kind };
}

export function logoMime(kind: LogoKind): string {
  return MIME_BY_KIND[kind][0];
}
