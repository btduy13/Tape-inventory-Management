// Static security headers applied to every response via next.config.ts.
// Content-Security-Policy is NOT here: it carries a per-request nonce (see csp.ts + src/proxy.ts).

export interface HeaderEntry {
  key: string;
  value: string;
}

export function staticSecurityHeaders(): HeaderEntry[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];
}
