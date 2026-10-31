// Rule: the respond endpoint caps the request body (8 KB) whether or not Content-Length is
// sent, answers 413 quickly, and an oversized body never consumes the token.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { postJson, postRaw } from "../helpers/http";
import { cleanupTestData, createSentQuote, getQuoteRow, getTokens, respondPath } from "../helpers/quotes";

describe("quotes: request body size is capped", () => {
  let fx: Awaited<ReturnType<typeof createSentQuote>>;

  beforeAll(async () => {
    fx = await createSentQuote();
  });
  afterAll(cleanupTestData);

  it("9 KB JSON with Content-Length -> 413", async () => {
    const r = await postJson(respondPath(fx.token), { action: "request_changes", note: "x".repeat(9 * 1024) });
    expect(r.status).toBe(413);
    expect(r.json).toEqual({ ok: false, error: "too_large" });
  });

  it("Content-Length header alone above the cap -> 413 without reading the body", async () => {
    const r = await postRaw(respondPath(fx.token), {
      headers: { "content-type": "application/json", "content-length": String(10 * 1024 * 1024) },
      body: "x".repeat(10 * 1024 * 1024),
    });
    expect(r.status).toBe(413);
  });

  it("1 MB chunked body without Content-Length -> 413 within 5 s", async () => {
    const chunk = new TextEncoder().encode(`{"action":"request_changes","note":"${"y".repeat(16 * 1024)}`);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 1024 * 1024) return controller.close();
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const started = Date.now();
    const r = await postRaw(respondPath(fx.token), {
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    }).catch((e: unknown) => ({ status: -1, text: String(e), headers: new Headers() }));
    expect(r.status).toBe(413);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("over-long note within the byte cap is rejected by validation (400)", async () => {
    const r = await postJson(respondPath(fx.token), { action: "request_changes", note: "z".repeat(2001) });
    expect(r.status).toBe(400);
  });

  it("oversized requests did not consume the token", async () => {
    expect((await getQuoteRow(fx.quoteId)).status).toBe("sent");
    expect((await getTokens(fx.quoteId))[0]!.revoked_at).toBeNull();
  });
});
