// Reads a multipart body with a hard byte cap BEFORE parsing (req.formData() has no limit).
import "server-only";

export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body too large");
    this.name = "BodyTooLargeError";
  }
}

export class BadBodyError extends Error {
  constructor() {
    super("Malformed request body");
    this.name = "BadBodyError";
  }
}

async function readCapped(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      // Release (not cancel): the caller drains the rest with discardBody(). A cancelled,
      // half-read body leaves unread bytes on the keep-alive socket, and the client's next
      // request on that socket then hangs.
      reader.releaseLock();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** True when the request declares a body above `maxBytes` (checked before any other work). */
export function declaresTooLarge(req: Request, maxBytes: number): boolean {
  const declared = Number(req.headers.get("content-length"));
  return Number.isFinite(declared) && declared > maxBytes;
}

/**
 * After a 413: reads and DISCARDS (never buffers) the rest of a body the client is
 * still uploading, so HTTP clients that only read the answer once their upload is done
 * (fetch/undici) get it. `next start` does not drain an unread route body by itself. Runs in
 * the background; stops reading (cancels) after `maxBytes`. A declared length above
 * `maxBytes` is not drained at all: the response is already out and the socket idles until
 * the server's request timeout.
 */
export function discardBody(req: Request, maxBytes: number): void {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return;
  const body = req.body;
  if (!body || body.locked) return;
  const reader = body.getReader();
  void (async () => {
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          return;
        }
      }
    } catch {
      /* client went away */
    }
  })();
}

/** Parses multipart/form-data with a byte cap. Throws BodyTooLargeError / BadBodyError. */
export async function readFormDataCapped(req: Request, maxBytes: number): Promise<FormData> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) throw new BadBodyError();
  if (declaresTooLarge(req, maxBytes)) throw new BodyTooLargeError();
  if (!req.body) throw new BadBodyError();

  const bytes = await readCapped(req.body, maxBytes);
  try {
    return await new Response(bytes, { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new BadBodyError();
  }
}
