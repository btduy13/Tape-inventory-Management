// Content-based file type detection (never trust the browser's declared MIME or file name).

export type SniffedType = "image/png" | "image/jpeg" | "image/svg+xml";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b);
}

/** True when the text (after BOM, XML prolog, comments, doctype) starts with an <svg> root. */
export function looksLikeSvg(bytes: Uint8Array): boolean {
  // Reject UTF-16/32 and binary early: SVG logos are UTF-8 text.
  if (bytes.includes(0)) return false;
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 4096));
  text = text.replace(/^﻿/, "");
  const prolog = /^\s*(<\?xml[^>]*\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>)/i;
  for (let i = 0; i < 20; i++) {
    const m = text.match(prolog);
    if (!m) break;
    text = text.slice(m[0].length);
  }
  return /^\s*<svg[\s>/]/i.test(text);
}

/** Detects PNG / JPEG / SVG from magic bytes. Anything else -> null. */
export function sniffImageType(bytes: Uint8Array): SniffedType | null {
  if (startsWith(bytes, PNG)) return "image/png";
  if (startsWith(bytes, JPEG)) return "image/jpeg";
  if (looksLikeSvg(bytes)) return "image/svg+xml";
  return null;
}

export const EXTENSION: Record<SniffedType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};
