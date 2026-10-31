// Rule: oversized request bodies are rejected early (413) without buffering the whole body.
// Body cap = 2 x 5 MB + 256 KB (MAX_BODY_BYTES).
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BASE_ORIGIN, BASE_URL } from "../helpers/env";
import {
  assertLiveIntakeUp,
  LEADS_PATH,
  MB,
  postDeclaredLength,
  resetLocalLeadRateLimit,
} from "../helpers/intake";

const OVER_CAP = 11 * MB;

describe("intake body cap: declared Content-Length above the cap is answered before the body arrives (live)", () => {
  beforeAll(assertLiveIntakeUp);
  beforeEach(resetLocalLeadRateLimit);

  it("Content-Length 50 MB with only 1 KB sent -> 413 without waiting for the rest", async () => {
    const r = await postDeclaredLength(50 * MB, 1024, 5000);
    expect(r.status).toBe(413);
  });
});

describe("intake body cap: chunked body without Content-Length is cut off at the cap (live)", () => {
  beforeAll(assertLiveIntakeUp);
  beforeEach(resetLocalLeadRateLimit);

  it("11 MB chunked multipart -> 413", async () => {
    const chunk = new Uint8Array(256 * 1024).fill(0x61);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= OVER_CAP) return controller.close();
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const res = await fetch(`${BASE_URL}${LEADS_PATH}`, {
      method: "POST",
      body,
      duplex: "half",
      headers: { origin: BASE_ORIGIN, "content-type": "multipart/form-data; boundary=----sectest" },
    } as RequestInit);
    expect(res.status).toBe(413);
  });

  it("well-formed 11 MB multipart with an honest Content-Length -> 413", async () => {
    const fd = new FormData();
    fd.append("name", "x");
    fd.append("logo", new Blob([new Uint8Array(OVER_CAP)], { type: "image/png" }), "big.png");
    const res = await fetch(`${BASE_URL}${LEADS_PATH}`, { method: "POST", body: fd, headers: { origin: BASE_ORIGIN } });
    expect(res.status).toBe(413);
  });
});

describe("intake body: non-multipart bodies are rejected (live)", () => {
  beforeAll(assertLiveIntakeUp);
  beforeEach(resetLocalLeadRateLimit);

  for (const ct of ["application/json", "application/x-www-form-urlencoded", "text/plain"]) {
    it(`${ct} -> 4xx, never 201`, async () => {
      const res = await fetch(`${BASE_URL}${LEADS_PATH}`, {
        method: "POST",
        body: ct === "application/json" ? JSON.stringify({ name: "x", turnstileToken: "t" }) : "name=x&turnstileToken=t",
        headers: { origin: BASE_ORIGIN, "content-type": ct },
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  }
});
