import { describe, expect, it } from "vitest";
import { clientIp, expandIpv6, rateLimitSubject, trustedProxyMode } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  const spoofed = {
    "x-forwarded-for": "6.6.6.6, 203.0.113.9",
    "x-real-ip": "203.0.113.7",
    "x-vercel-forwarded-for": "198.51.100.2",
  };

  it("vercel: prefers the edge-set headers over a spoofable X-Forwarded-For", () => {
    expect(clientIp(h(spoofed), "vercel")).toBe("198.51.100.2");
    expect(clientIp(h({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "203.0.113.7" }), "vercel")).toBe("203.0.113.7");
    expect(clientIp(h({ "x-forwarded-for": "1.1.1.1" }), "vercel")).toBe("unknown");
  });

  it("x-real-ip: only X-Real-IP (set by our reverse proxy)", () => {
    expect(clientIp(h(spoofed), "x-real-ip")).toBe("203.0.113.7");
    expect(clientIp(h({ "x-forwarded-for": "1.1.1.1" }), "x-real-ip")).toBe("unknown");
  });

  it("xff: uses the RIGHTMOST X-Forwarded-For entry (appended by the trusted proxy)", () => {
    // attacker sends "X-Forwarded-For: 6.6.6.6"; the proxy appends the real address
    expect(clientIp(h(spoofed), "xff")).toBe("203.0.113.9");
  });

  it("none: no header is trusted, so spoofed values never create new buckets", () => {
    expect(clientIp(h(spoofed), "none")).toBe("unknown");
    expect(clientIp(h({ "x-real-ip": "10.0.0.1" }), "none")).toBe("unknown");
  });

  it("ignores garbage and returns unknown", () => {
    expect(clientIp(h({ "x-real-ip": "<script>", "x-forwarded-for": "not-an-ip" }), "x-real-ip")).toBe("unknown");
    expect(clientIp(h({ "x-forwarded-for": "not-an-ip" }), "xff")).toBe("unknown");
    expect(clientIp(h({}), "vercel")).toBe("unknown");
  });
});

describe("trustedProxyMode", () => {
  it("defaults to none off Vercel and vercel on Vercel", () => {
    expect(trustedProxyMode({})).toBe("none");
    expect(trustedProxyMode({ VERCEL: "1" })).toBe("vercel");
  });

  it("honours a valid TRUSTED_PROXY and ignores invalid values", () => {
    expect(trustedProxyMode({ TRUSTED_PROXY: "x-real-ip" })).toBe("x-real-ip");
    expect(trustedProxyMode({ TRUSTED_PROXY: "XFF", VERCEL: "1" })).toBe("xff");
    expect(trustedProxyMode({ TRUSTED_PROXY: "everything" })).toBe("none");
  });
});

describe("rateLimitSubject", () => {
  it("keeps IPv4", () => {
    expect(rateLimitSubject("203.0.113.9")).toBe("203.0.113.9");
  });

  it("buckets IPv6 by /64 so one customer cannot rotate addresses", () => {
    const a = rateLimitSubject("2001:db8:1:2:aaaa:bbbb:cccc:1");
    const b = rateLimitSubject("2001:db8:1:2::ffff");
    expect(a).toBe("2001:db8:1:2::/64");
    expect(b).toBe(a);
    expect(rateLimitSubject("2001:db8:1:3::1")).not.toBe(a);
  });

  it("maps IPv4-mapped IPv6 to IPv4", () => {
    expect(rateLimitSubject("::ffff:203.0.113.9")).toBe("203.0.113.9");
  });

  it("rejects malformed IPv6", () => {
    expect(expandIpv6("1::2::3")).toBeNull();
    expect(rateLimitSubject("zz::1")).toBe("unknown");
  });
});
