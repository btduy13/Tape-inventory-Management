// Logic for POST /api/giao/[token] (the app route file only re-exports this).
// Body: the raw photo bytes (Content-Type image/*). Order of checks: cheap guards, rate
// limits, capped read, note state, photo check, upload, confirm_delivery. Any failure before
// confirm_delivery leaves the note open; a failed confirm deletes the uploaded photo.
import "server-only";
import { NextResponse } from "next/server";
import { randomToken } from "@/lib/security/hash";
import { assertSameOrigin, CsrfError } from "@/lib/security/csrf";
import type { DeliveryErrorCode } from "../lib/copy";
import { hashDeliveryToken, isDeliveryToken, noteAccess } from "../lib/token";
import {
  createDeliveryDeps,
  DELIVERY_RATE_LIMITS,
  type ConfirmError,
  type ConfirmOutcome,
  type DeliveryDeps,
} from "./deps";
import { MAX_PHOTO_BYTES, processDeliveryPhoto } from "./photo";

const NO_STORE = { "Cache-Control": "no-store" };

const fail = (status: number, error: DeliveryErrorCode) =>
  NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });

/** Reads the body as bytes, stopping at `max`. Null = too large. */
export async function readBytesCapped(req: Request, max: number): Promise<Buffer | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return Buffer.alloc(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, total);
}

const ACCESS_ERROR = {
  confirmed: [409, "already_confirmed"],
  replaced: [410, "replaced"],
  not_ready: [409, "not_ready"],
} as const;

const CONFIRM_STATUS: Record<ConfirmError, number> = {
  not_found: 404,
  already_confirmed: 409,
  replaced: 410,
  not_ready: 409,
  server_error: 500,
};

export async function handleConfirmRequest(
  req: Request,
  rawToken: string,
  deps: () => DeliveryDeps = createDeliveryDeps,
): Promise<Response> {
  try {
    assertSameOrigin(req);
  } catch (err) {
    if (err instanceof CsrfError) return fail(403, "forbidden");
    throw err;
  }
  if (!isDeliveryToken(rawToken)) return fail(404, "not_found");
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("image/")) {
    return fail(415, "unsupported_media_type");
  }

  const d = deps();
  const tokenHash = await hashDeliveryToken(rawToken);
  if (!(await d.allowIp(req.headers, DELIVERY_RATE_LIMITS.confirmIp)) || !(await d.allowToken(tokenHash))) {
    return fail(429, "rate_limited");
  }

  const body = await readBytesCapped(req, MAX_PHOTO_BYTES);
  if (body === null) return fail(413, "too_large");

  // State first, so a locked/replaced note never costs an image decode or an upload.
  const note = await d.findNote(tokenHash);
  if (!note) return fail(404, "not_found");
  const access = noteAccess(note);
  if (access !== "capture") {
    const [status, error] = ACCESS_ERROR[access];
    return fail(status, error);
  }

  const photo = await processDeliveryPhoto(body);
  if (!photo.ok) return fail(422, photo.error);

  // Path rule enforced by confirm_delivery: <note_id>/<[A-Za-z0-9_-]{1,80}>.jpg
  const path = `${note.noteId}/${randomToken(16)}.jpg`;
  if (!(await d.upload(path, photo.jpeg))) return fail(500, "server_error");

  let outcome: ConfirmOutcome;
  try {
    outcome = await d.confirm(tokenHash, path);
  } catch {
    outcome = { ok: false, error: "server_error" };
  }
  if (!outcome.ok) {
    await d.remove(path).catch(() => undefined);
    return fail(CONFIRM_STATUS[outcome.error], outcome.error);
  }
  return NextResponse.json({ ok: true, confirmedAt: outcome.confirmedAt }, { status: 200, headers: NO_STORE });
}
