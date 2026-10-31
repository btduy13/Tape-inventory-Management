// Rule: the per-client limit (5 lead submissions / hour) cannot be escaped by a client that
// varies X-Forwarded-For / X-Real-IP / x-vercel-forwarded-for, or rotates IPv6 inside its /64.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomIp } from "../helpers/http";
import {
  assertLiveIntakeUp,
  cleanupIntakeData,
  leadForm,
  postLeadLive,
  resetLocalLeadRateLimit,
  submitInProcess,
} from "../helpers/intake";

const LIMIT = 5;
const ATTEMPTS = LIMIT + 3;

afterAll(cleanupIntakeData);

/** Sends ATTEMPTS live requests from ONE real client (this test process) with spoofed headers. */
async function liveStatuses(spoof: (i: number) => Record<string, string>): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < ATTEMPTS; i++) {
    // No token: the request stops at the captcha step (after the rate limit) and stores nothing.
    const res = await postLeadLive(await leadForm({ turnstileToken: null }), spoof(i));
    out.push(res.status);
  }
  return out;
}

describe("intake rate limit: client-supplied forwarding headers do not create new buckets (live)", () => {
  beforeAll(assertLiveIntakeUp);
  beforeEach(resetLocalLeadRateLimit);

  it("varying X-Real-IP per request still hits 429 after the limit", async () => {
    const statuses = await liveStatuses(() => ({ "x-real-ip": randomIp() }));
    expect(statuses, `statuses: ${statuses.join(",")}`).toContain(429);
  });

  it("varying X-Forwarded-For per request still hits 429 after the limit", async () => {
    const statuses = await liveStatuses(() => ({ "x-forwarded-for": randomIp() }));
    expect(statuses, `statuses: ${statuses.join(",")}`).toContain(429);
  });

  it("varying x-vercel-forwarded-for per request still hits 429 after the limit", async () => {
    const statuses = await liveStatuses(() => ({ "x-vercel-forwarded-for": randomIp() }));
    expect(statuses, `statuses: ${statuses.join(",")}`).toContain(429);
  });

  it("control: same client without spoofed headers hits 429 after the limit", async () => {
    const statuses = await liveStatuses(() => ({}));
    expect(statuses.slice(0, LIMIT).every((s) => s !== 429), `statuses: ${statuses.join(",")}`).toBe(true);
    expect(statuses.slice(LIMIT).every((s) => s === 429), `statuses: ${statuses.join(",")}`).toBe(true);
  });
});

describe("intake rate limit: trusted-edge IP semantics (in-process, real DB limiter)", () => {
  it("one IPv4 client is limited to 5 accepted submissions per window", async () => {
    const ip = randomIp();
    const statuses: number[] = [];
    for (let i = 0; i < ATTEMPTS; i++) statuses.push((await submitInProcess(await leadForm(), { ip })).status);
    expect(statuses.filter((s) => s === 201).length, `statuses: ${statuses.join(",")}`).toBeLessThanOrEqual(LIMIT);
    expect(statuses.slice(LIMIT)).toEqual(Array(ATTEMPTS - LIMIT).fill(429));
  });

  it("rotating IPv6 addresses inside one /64 shares one bucket", async () => {
    const prefix = `2001:db8:${Math.floor(Math.random() * 0xffff).toString(16)}:${Math.floor(Math.random() * 0xffff).toString(16)}`;
    const statuses: number[] = [];
    for (let i = 0; i < ATTEMPTS; i++) {
      const ip = `${prefix}:${(i + 1).toString(16)}:${Math.floor(Math.random() * 0xffff).toString(16)}::1`;
      statuses.push((await submitInProcess(await leadForm({ turnstileToken: null }), { ip })).status);
    }
    expect(statuses.slice(LIMIT), `statuses: ${statuses.join(",")}`).toEqual(Array(ATTEMPTS - LIMIT).fill(429));
  });

  it("an extra leftmost X-Forwarded-For entry does not change the bucket", async () => {
    const real = randomIp();
    const statuses: number[] = [];
    for (let i = 0; i < ATTEMPTS; i++) {
      const r = await submitInProcess(await leadForm({ turnstileToken: null }), {
        ip: real,
        headers: { "x-forwarded-for": `${randomIp()}, ${real}` },
      });
      statuses.push(r.status);
    }
    expect(statuses.slice(LIMIT), `statuses: ${statuses.join(",")}`).toEqual(Array(ATTEMPTS - LIMIT).fill(429));
  });
});
