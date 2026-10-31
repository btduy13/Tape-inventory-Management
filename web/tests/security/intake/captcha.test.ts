// Rule: POST /api/leads stores nothing unless a valid Turnstile token is verified server-side.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertLiveIntakeUp,
  cleanupIntakeData,
  DUMMY_TOKEN,
  leadForm,
  leadsWithNameLike,
  postLeadLive,
  resetLocalLeadRateLimit,
  submitInProcess,
  TURNSTILE_SECRETS,
  uniqueTag,
} from "../helpers/intake";

afterAll(cleanupIntakeData);

describe("intake captcha: live requests without a valid token are rejected", () => {
  beforeAll(assertLiveIntakeUp);
  beforeEach(resetLocalLeadRateLimit);

  const cases: [string, Record<string, string | null>][] = [
    ["missing token", { turnstileToken: null }],
    ["empty token", { turnstileToken: "" }],
    ["oversized token (>2048 chars)", { turnstileToken: "A".repeat(4096) }],
  ];
  for (const [label, override] of cases) {
    it(`${label} -> 400 captcha, no lead stored`, async () => {
      const tag = uniqueTag();
      const res = await postLeadLive(await leadForm({ name: tag, ...override }));
      expect(res.status).toBe(400);
      expect(res.json?.error).toBe("captcha");
      expect(await leadsWithNameLike(tag)).toHaveLength(0);
    });
  }

  it("token sent as a file part instead of a string -> 400 captcha", async () => {
    const tag = uniqueTag();
    const res = await postLeadLive(await leadForm({ name: tag, turnstileToken: { bytes: DUMMY_TOKEN, name: "t.txt" } }));
    expect(res.status).toBe(400);
    expect(res.json?.error).toBe("captcha");
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });
});

describe("intake captcha: Cloudflare 'always fail' / 'spent token' secrets reject (in-process)", () => {
  it("always-fail secret (2x...) -> 400 captcha, nothing stored", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag }), { secret: TURNSTILE_SECRETS.alwaysFail });
    expect(r.siteverifyCalls).toHaveLength(1);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("captcha");
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });

  it("token-already-spent secret (3x...) -> 400 captcha, nothing stored", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag }), { secret: TURNSTILE_SECRETS.tokenSpent });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("captcha");
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });

  it("control: always-pass secret (1x...) with the dummy token is accepted", async () => {
    const r = await submitInProcess(await leadForm());
    expect(r.status).toBe(201);
    expect(r.body.ok).toBe(true);
  });
});

describe("intake captcha: real-key success for the wrong action/hostname is rejected (in-process)", () => {
  const realSecret = "0x4AAAAAAA-sectest-not-a-real-secret";

  it("token solved for another widget action -> 400 captcha", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag }), {
      secret: realSecret,
      siteverify: { success: true, action: "login", hostname: "localhost" },
    });
    expect(r.status).toBe(400);
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });

  it("token solved on a foreign hostname -> 400 captcha", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag }), {
      secret: realSecret,
      siteverify: { success: true, action: "lead_submit", hostname: "evil.example" },
    });
    expect(r.status).toBe(400);
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });

  it("success reply without hostname -> 400 captcha", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag }), {
      secret: realSecret,
      siteverify: { success: true, action: "lead_submit" },
    });
    expect(r.status).toBe(400);
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });
});
