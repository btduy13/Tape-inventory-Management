import { describe, expect, it } from "vitest";
import { assertProductionSecrets, isProductionRuntime, type ServerEnv } from "./env.server";

const base: ServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY: "service",
  EMAIL_FROM: "x <a@b.vn>",
  ADMIN_NOTIFY_EMAILS: [],
  TURNSTILE_SECRET_KEY: "0x4AAAAAAArealSecretValue",
  IP_HASH_SALT: "a-long-random-production-salt",
  QUOTE_TOKEN_TTL_DAYS: 14,
};

describe("isProductionRuntime", () => {
  it("detects Vercel production but not preview", () => {
    expect(isProductionRuntime({ VERCEL_ENV: "production", NODE_ENV: "production" })).toBe(true);
    expect(isProductionRuntime({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(false);
  });
  it("treats self-hosted next start as production unless opted out", () => {
    expect(isProductionRuntime({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionRuntime({ NODE_ENV: "production", ALLOW_TEST_SECRETS: "1" })).toBe(false);
    expect(isProductionRuntime({ NODE_ENV: "development" })).toBe(false);
  });
});

describe("assertProductionSecrets", () => {
  const prod = { VERCEL_ENV: "production" };

  it("rejects the always-pass Turnstile test secret in production (bot check bypass)", () => {
    const env = { ...base, TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" };
    expect(() => assertProductionSecrets(env, prod)).toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it("rejects the default IP hash salt in production", () => {
    expect(() => assertProductionSecrets({ ...base, IP_HASH_SALT: "dev-only-salt-change-me" }, prod)).toThrow(
      /IP_HASH_SALT/,
    );
    expect(() =>
      assertProductionSecrets({ ...base, IP_HASH_SALT: "change-me-to-a-long-random-string" }, prod),
    ).toThrow(/IP_HASH_SALT/);
  });

  it("accepts real secrets in production and test secrets in development", () => {
    expect(() => assertProductionSecrets(base, prod)).not.toThrow();
    const dev = { ...base, TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" };
    expect(() => assertProductionSecrets(dev, { NODE_ENV: "development" })).not.toThrow();
  });
});
