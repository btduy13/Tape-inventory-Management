import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "./csp";

describe("buildCsp", () => {
  const prod = buildCsp({ nonce: "abc123", isDev: false, supabaseUrl: "https://xyz.supabase.co" });

  it("uses nonce + strict-dynamic for scripts and no unsafe-eval in prod", () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).not.toContain("'unsafe-inline'");
  });

  it("allows Supabase https + wss and Turnstile frames", () => {
    expect(prod).toMatch(/connect-src [^;]*https:\/\/xyz\.supabase\.co/);
    expect(prod).toMatch(/connect-src [^;]*wss:\/\/xyz\.supabase\.co/);
    expect(prod).toContain("frame-src https://challenges.cloudflare.com");
  });

  it("blocks framing, objects and enforces https", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("upgrade-insecure-requests");
  });

  it("relaxes only what dev needs", () => {
    const dev = buildCsp({ nonce: "n", isDev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("ignores malformed supabase url", () => {
    expect(() => buildCsp({ nonce: "n", isDev: false, supabaseUrl: "not a url" })).not.toThrow();
  });
});

describe("generateNonce", () => {
  it("is random base64", () => {
    const a = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a).not.toBe(generateNonce());
  });
});
