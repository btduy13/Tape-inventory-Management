// Auth-specific rate-limit buckets (checked with lib/security/rate-limit checkRateLimit).
import "server-only";
import type { RateLimitRule } from "@/lib/security/rate-limit";

export const AUTH_RATE_LIMITS = {
  login: { name: "auth-login", windowSeconds: 900, maxHits: 10 },
  passwordReset: { name: "auth-reset", windowSeconds: 3600, maxHits: 5 },
} as const satisfies Record<string, RateLimitRule>;
