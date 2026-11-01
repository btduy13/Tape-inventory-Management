// Sender selection: production without RESEND_API_KEY must fail closed, not fake success.
import { afterEach, describe, expect, it, vi } from "vitest";

async function freshFactory() {
  vi.resetModules();
  return import("./factory");
}

const MSG = { to: ["a@example.com"], subject: "s", html: "<p>x</p>", text: "x" };

describe("getEmailSender", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("dev without a key: fake sender that reports success", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service");
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("VERCEL_ENV", "development");
    const { getEmailSender } = await freshFactory();
    const sender = getEmailSender();
    expect(sender.kind).toBe("fake");
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect((await sender.send(MSG)).ok).toBe(true);
  });

  it("production without a key: every send fails (quote is not marked sent)", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service");
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x4AAAAAAA-real-looking-secret");
    vi.stubEnv("IP_HASH_SALT", "a-real-production-salt-value");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getEmailSender } = await freshFactory();
    const result = await getEmailSender().send(MSG);
    expect(result).toEqual({ ok: false, error: "email not configured" });
    expect(errors).toHaveBeenCalled();
  });

  it("dev without a key logs the customer quote link (raw token is never stored)", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service");
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("VERCEL_ENV", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { getEmailSender } = await freshFactory();
    const link = `http://localhost:3000/q/${"a".repeat(43)}`;
    await getEmailSender().send({ ...MSG, text: `Xem và phản hồi: ${link}` });
    expect(info.mock.calls.flat().some((l) => String(l).includes(link))).toBe(true);
  });
});
