// Client IP for rate limiting / abuse hashing. Pure, so it is unit-testable.
//
// Security notes:
//   * Forwarding headers (X-Forwarded-For, X-Real-IP, x-vercel-forwarded-for) are plain
//     request headers. They are only meaningful when a TRUSTED proxy in front of the app
//     overwrites them; otherwise the client picks the value and rotates rate-limit buckets.
//     `next start` itself never overwrites a client-sent X-Forwarded-For / X-Real-IP.
//   * Which header is trusted is a deployment decision (TRUSTED_PROXY, see trustedProxyMode):
//       vercel     x-vercel-forwarded-for, then x-real-ip (both overwritten by the Vercel edge).
//                  Default when VERCEL=1.
//       x-real-ip  a reverse proxy you run (nginx `proxy_set_header X-Real-IP $remote_addr`).
//       xff        the RIGHTMOST X-Forwarded-For entry (appended by one trusted proxy).
//       none       no trusted proxy (default off Vercel): every header is ignored and the
//                  client is "unknown". All clients then share one rate-limit bucket, which
//                  fails safe (strict) instead of letting each spoofed value get a bucket.
//   * One IPv6 customer controls at least a /64, so IPv6 addresses are bucketed by /64.

export type TrustedProxyMode = "vercel" | "x-real-ip" | "xff" | "none";

const MODES: readonly TrustedProxyMode[] = ["vercel", "x-real-ip", "xff", "none"];

/** Deployment's trusted proxy: TRUSTED_PROXY if valid, else "vercel" on Vercel, else "none". */
export function trustedProxyMode(env: Record<string, string | undefined> = process.env): TrustedProxyMode {
  const configured = env.TRUSTED_PROXY?.trim().toLowerCase();
  if (configured && (MODES as readonly string[]).includes(configured)) return configured as TrustedProxyMode;
  return env.VERCEL === "1" ? "vercel" : "none";
}

const MAX_IP_LENGTH = 64;

function firstValid(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v || v.length > MAX_IP_LENGTH) return null;
  return isIpv4(v) || isIpv6(v) ? v : null;
}

export function isIpv4(ip: string): boolean {
  const parts = ip.split(".");
  return (
    parts.length === 4 &&
    parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
  );
}

export function isIpv6(ip: string): boolean {
  return ip.includes(":") && expandIpv6(ip) !== null;
}

/** Expands an IPv6 literal to 8 hextets, or null if malformed. Handles :: and embedded IPv4. */
export function expandIpv6(input: string): string[] | null {
  let ip = input.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0]!;
  // embedded IPv4 tail (e.g. ::ffff:1.2.3.4)
  const v4 = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) {
    if (!isIpv4(v4[1]!)) return null;
    const [a, b, c, d] = v4[1]!.split(".").map(Number) as [number, number, number, number];
    ip = ip.slice(0, -v4[1]!.length) + ((a << 8) | b).toString(16) + ":" + ((c << 8) | d).toString(16);
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (all.length !== 8 || !all.every((h) => /^[0-9a-f]{1,4}$/.test(h))) return null;
  return all.map((h) => h.replace(/^0+(?=.)/, ""));
}

/** Rate-limit bucket for an IP: IPv4 as-is, IPv6 reduced to its /64 prefix. */
export function rateLimitSubject(ip: string): string {
  if (isIpv4(ip)) return ip;
  const hextets = expandIpv6(ip);
  if (!hextets) return "unknown";
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) -> plain IPv4
  if (hextets.slice(0, 5).every((h) => h === "0") && hextets[5] === "ffff") {
    const a = parseInt(hextets[6]!, 16);
    const b = parseInt(hextets[7]!, 16);
    return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  }
  return `${hextets.slice(0, 4).join(":")}::/64`;
}

/**
 * Client IP as reported by the deployment's trusted proxy; "unknown" when there is none or
 * its header is missing/malformed. Never reads a header the trusted proxy does not overwrite.
 */
export function clientIp(headers: Headers, mode: TrustedProxyMode = trustedProxyMode()): string {
  switch (mode) {
    case "vercel":
      return (
        firstValid(headers.get("x-vercel-forwarded-for")?.split(",")[0]) ??
        firstValid(headers.get("x-real-ip")) ??
        "unknown"
      );
    case "x-real-ip":
      return firstValid(headers.get("x-real-ip")) ?? "unknown";
    case "xff": {
      const parts = (headers.get("x-forwarded-for") ?? "").split(",");
      return firstValid(parts[parts.length - 1]) ?? "unknown";
    }
    default:
      return "unknown";
  }
}
