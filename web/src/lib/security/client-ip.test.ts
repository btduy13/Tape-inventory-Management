import { describe, expect, it } from "vitest";
import { clientIp, expandIpv6, rateLimitSubject } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("prefers edge-set headers over a spoofable X-Forwarded-For", () => {
    expect(clientIp(h({ "x-forwarded-for": "1.1.1.1, 9.9.9.9", "x-real-ip": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
    expect(clientIp(h({ "x-vercel-forwarded-for": "198.51.100.2", "x-real-ip": "203.0.113.7" }))).toBe(
      "198.51.100.2",
    );
  });

  it("uses the RIGHTMOST X-Forwarded-For entry (appended by the trusted proxy)", () => {
    // attacker sends "X-Forwarded-For: 6.6.6.6"; the proxy appends the real address
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("ignores garbage and returns unknown", () => {
    expect(clientIp(h({ "x-real-ip": "<script>", "x-forwarded-for": "not-an-ip" }))).toBe("unknown");
    expect(clientIp(h({}))).toBe("unknown");
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
