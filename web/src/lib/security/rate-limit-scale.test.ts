import { describe, expect, it } from "vitest";
import { DEV_RATE_LIMIT_MULTIPLIER, rateLimitMultiplier, scaledMaxHits } from "./rate-limit-scale";

describe("rateLimitMultiplier", () => {
  it("never relaxes production", () => {
    expect(rateLimitMultiplier({ NODE_ENV: "production", RATE_LIMIT_MULTIPLIER: "50" })).toBe(1);
    expect(rateLimitMultiplier({ NODE_ENV: "development", VERCEL_ENV: "production" })).toBe(1);
  });
  it("relaxes next dev by default", () => {
    expect(rateLimitMultiplier({ NODE_ENV: "development" })).toBe(DEV_RATE_LIMIT_MULTIPLIER);
    expect(scaledMaxHits(10, { NODE_ENV: "development" })).toBe(10 * DEV_RATE_LIMIT_MULTIPLIER);
  });
  it("honours a bounded override outside production", () => {
    expect(rateLimitMultiplier({ NODE_ENV: "test", RATE_LIMIT_MULTIPLIER: "5" })).toBe(5);
    expect(rateLimitMultiplier({ NODE_ENV: "development", RATE_LIMIT_MULTIPLIER: "1" })).toBe(1);
    expect(rateLimitMultiplier({ NODE_ENV: "test", RATE_LIMIT_MULTIPLIER: "1000" })).toBe(1);
    expect(rateLimitMultiplier({ NODE_ENV: "test", RATE_LIMIT_MULTIPLIER: "-3" })).toBe(1);
    expect(rateLimitMultiplier({ NODE_ENV: "test" })).toBe(1);
  });
});
