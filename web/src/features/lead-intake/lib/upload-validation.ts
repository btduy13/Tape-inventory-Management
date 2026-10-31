// Validates an uploaded logo / preview: size cap, magic-byte type, SVG sanitizing.
import { MAX_FILE_BYTES } from "./api-contract";
import { EXTENSION, sniffImageType, type SniffedType } from "./file-sniff";
import { sanitizeSvg } from "./sanitize-svg";

export type UploadKind = "logo" | "preview";

const ALLOWED: Record<UploadKind, readonly SniffedType[]> = {
  logo: ["image/png", "image/jpeg", "image/svg+xml"],
  preview: ["image/png"],
};

export type ValidUpload = { bytes: Uint8Array; contentType: SniffedType; extension: string };
export type UploadResult =
  | { ok: true; file: ValidUpload | null }
  | { ok: false; error: "file" | "too_large" };

// Duck-typed: multipart Files may come from a different realm (undici vs. DOM Blob).
function isBlob(value: unknown): value is Blob {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<Blob>;
  return typeof v.size === "number" && typeof v.arrayBuffer === "function";
}

/**
 * `value` is the raw multipart entry. Missing / empty -> { ok: true, file: null }.
 * A string where a file is expected is rejected.
 */
export async function validateUpload(value: unknown, kind: UploadKind): Promise<UploadResult> {
  if (value === null || value === undefined || value === "") return { ok: true, file: null };
  if (!isBlob(value)) return { ok: false, error: "file" };
  if (value.size === 0) return { ok: true, file: null };
  if (value.size > MAX_FILE_BYTES) return { ok: false, error: "too_large" };

  const bytes = new Uint8Array(await value.arrayBuffer());
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, error: "too_large" };

  const type = sniffImageType(bytes);
  if (!type || !ALLOWED[kind].includes(type)) return { ok: false, error: "file" };

  if (type === "image/svg+xml") {
    const clean = sanitizeSvg(new TextDecoder().decode(bytes));
    if (!clean) return { ok: false, error: "file" };
    const out = new TextEncoder().encode(clean);
    if (out.byteLength > MAX_FILE_BYTES) return { ok: false, error: "too_large" };
    return { ok: true, file: { bytes: out, contentType: type, extension: EXTENSION[type] } };
  }
  return { ok: true, file: { bytes, contentType: type, extension: EXTENSION[type] } };
}
