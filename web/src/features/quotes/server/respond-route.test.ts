// Route-level guards of POST /api/q/[token]/respond (CSRF, media type, rate limit, body cap).
import { describe, expect, it, vi } from "vitest";

const rateLimit = vi.hoisted(() => ({ allow: true }));
vi.mock("@/lib/security/rate-limit", () => ({
  RATE_LIMITS: { quoteRespond: { name: "quote-respond", windowSeconds: 3600, maxHits: 10 } },
  checkRateLimit: async () => rateLimit.allow,
}));
vi.mock("./respond-deps", () => ({ createRespondDeps: () => ({}) }));

const { handleRespondRequest, readTextCapped } = await import("./respond-route");

const URL_ = "https://bangkeo.test/api/q/tok/respond";
const TOKEN = "a".repeat(43);

function req(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: "POST",
    body,
    headers: { origin: "https://bangkeo.test", "content-type": "application/json", ...headers },
  });
}

/** Fake deps: never reached in these tests unless the guards pass. */
const neverDeps = () => {
  throw new Error("deps must not be built");
};

describe("handleRespondRequest guards", () => {
  it("rejects cross-site posts", async () => {
    const res = await handleRespondRequest(req("{}", { origin: "https://evil.test" }), TOKEN, neverDeps);
    expect(res.status).toBe(403);
  });

  it("rejects non-JSON bodies (form posts cannot reach it)", async () => {
    const res = await handleRespondRequest(req("action=accept", { "content-type": "text/plain" }), TOKEN, neverDeps);
    expect(res.status).toBe(415);
  });

  it("returns 429 when rate limited", async () => {
    rateLimit.allow = false;
    try {
      const res = await handleRespondRequest(req('{"action":"accept"}'), TOKEN, neverDeps);
      expect(res.status).toBe(429);
    } finally {
      rateLimit.allow = true;
    }
  });

  it("stops reading oversized bodies (413) without building deps", async () => {
    const big = JSON.stringify({ action: "request_changes", note: "x".repeat(20_000) });
    const res = await handleRespondRequest(req(big), TOKEN, neverDeps);
    expect(res.status).toBe(413);
  });
});

describe("readTextCapped", () => {
  it("rejects a declared length over the cap before reading", async () => {
    const r = req("{}", { "content-length": "999999" });
    expect(await readTextCapped(r, 10)).toBeNull();
  });

  it("rejects a streamed body over the cap even without content-length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 5; i++) c.enqueue(new Uint8Array(1000));
        c.close();
      },
    });
    const r = new Request(URL_, { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await readTextCapped(r, 4000)).toBeNull();
  });

  it("returns the text when under the cap", async () => {
    expect(await readTextCapped(req('{"a":1}'), 100)).toBe('{"a":1}');
  });
});
