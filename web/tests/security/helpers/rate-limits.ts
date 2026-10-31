// Rate-limit buckets of THIS test process as the live server sees it.
//
// The live server under test is a plain `next start` with no trusted proxy (TRUSTED_PROXY
// unset), so it ignores X-Real-IP / X-Forwarded-For and every local request maps to one
// bucket ("unknown"; the loopback subjects are listed for a server configured otherwise).
// Suites that are not about rate limiting clear the buckets they use with the service key
// instead of spoofing a fresh client IP per request (which INTAKE-RL-1 closed).
import { createHash } from "node:crypto";
import { serviceClient } from "./clients";

const LOCAL_SUBJECTS = ["unknown", "127.0.0.1", "0:0:0:0::/64"] as const;

/** Rules the webapp / quotes suites hit on the live server (not lead-submit: see intake.ts). */
export const SHARED_RULES = ["auth-login", "auth-reset", "quote-view", "quote-respond"] as const;

function keysFor(rules: readonly string[]): string[] {
  const salt = process.env.IP_HASH_SALT ?? "dev-only-salt-change-me";
  const hashes = LOCAL_SUBJECTS.map((s) => createHash("sha256").update(`${salt}:${s}`).digest("hex"));
  return rules.flatMap((rule) => hashes.map((h) => `${rule}:${h}`));
}

/** Deletes the local client's rows for the given rate-limit rules. */
export async function resetLocalRateLimits(rules: readonly string[] = SHARED_RULES): Promise<void> {
  const { error } = await serviceClient().from("rate_limits").delete().in("key", keysFor(rules));
  if (error) throw new Error(`[security suite] rate limit reset failed: ${error.message}`);
}
