// Per-IP fixed-window rate limit backed by public.check_rate_limit (migration 0008).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env.server";
import { sha256Hex } from "@/lib/security/hash";
import { clientIp, rateLimitSubject } from "@/lib/security/client-ip";

export interface RateLimitRule {
  /** Logical bucket, e.g. "lead-submit" or "quote-respond". */
  name: string;
  windowSeconds: number;
  maxHits: number;
}

export const RATE_LIMITS = {
  leadSubmit: { name: "lead-submit", windowSeconds: 3600, maxHits: 5 },
  quoteView: { name: "quote-view", windowSeconds: 300, maxHits: 60 },
  quoteRespond: { name: "quote-respond", windowSeconds: 3600, maxHits: 10 },
  logoUpload: { name: "logo-upload", windowSeconds: 3600, maxHits: 20 },
} as const satisfies Record<string, RateLimitRule>;

// Spoof-resistant IP derivation lives in client-ip.ts (pure + unit-tested).
export { clientIp } from "@/lib/security/client-ip";

export async function hashIp(ip: string): Promise<string> {
  return sha256Hex(`${serverEnv().IP_HASH_SALT}:${ip}`);
}

/** Returns true if allowed. Fails CLOSED (false) if the DB call errors. */
export async function checkRateLimit(headers: Headers, rule: RateLimitRule): Promise<boolean> {
  // IPv6 is bucketed per /64 (rateLimitSubject), otherwise one host rotates 2^64 addresses.
  const key = `${rule.name}:${await hashIp(rateLimitSubject(clientIp(headers)))}`;
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: rule.windowSeconds,
    p_max_hits: rule.maxHits,
  });
  if (error) return false;
  return data === true;
}
