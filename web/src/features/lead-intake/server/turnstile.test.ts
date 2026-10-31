import { describe, expect, it, vi } from "vitest";
import { TURNSTILE_VERIFY_URL, verifyTurnstile } from "./turnstile";

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("verifyTurnstile", () => {
  it("posts secret, token and ip to siteverify", async () => {
    const fetchImpl = reply({ success: true, action: "lead_submit" });
    const ok = await verifyTurnstile("tok", { secret: "s", remoteIp: "1.2.3.4", action: "lead_submit", fetchImpl });
    expect(ok).toBe(true);
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const body = init!.body as URLSearchParams;
    expect(body.get("secret")).toBe("s");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("omits unknown ip", async () => {
    const fetchImpl = reply({ success: true });
    await verifyTurnstile("tok", { secret: "s", remoteIp: "unknown", fetchImpl });
    const body = vi.mocked(fetchImpl).mock.calls[0]![1]!.body as URLSearchParams;
    expect(body.has("remoteip")).toBe(false);
  });

  it.each([
    ["success false", reply({ success: false })],
    ["http error", reply({ success: true }, 500)],
    ["action mismatch", reply({ success: true, action: "login" })],
    ["network error", vi.fn(async () => { throw new Error("down"); }) as unknown as typeof fetch],
  ])("fails closed on %s", async (_n, fetchImpl) => {
    expect(await verifyTurnstile("tok", { secret: "s", action: "lead_submit", fetchImpl })).toBe(false);
  });

  it("rejects missing / oversized tokens without calling Cloudflare", async () => {
    const fetchImpl = reply({ success: true });
    expect(await verifyTurnstile(null, { secret: "s", fetchImpl })).toBe(false);
    expect(await verifyTurnstile("", { secret: "s", fetchImpl })).toBe(false);
    expect(await verifyTurnstile("x".repeat(2049), { secret: "s", fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts the Cloudflare test action", async () => {
    expect(await verifyTurnstile("tok", { secret: "s", action: "lead_submit", fetchImpl: reply({ success: true, action: "test" }) })).toBe(true);
  });
});
