// Local-dev relief for the shared "unknown" rate-limit bucket. Pure, so it is unit-testable.
//
// Without a trusted proxy every local client maps to one bucket, so parallel dev / QC
// sessions lock each other out of login and lead submit. Outside production the limits can
// be scaled up; production (and any NODE_ENV=production build) always uses the real limits.
//   * `next dev` (NODE_ENV=development): x20 by default.
//   * RATE_LIMIT_MULTIPLIER=1..100 overrides it, honoured only when NODE_ENV is not production.

type Env = Record<string, string | undefined>;

export const DEV_RATE_LIMIT_MULTIPLIER = 20;
const MAX_MULTIPLIER = 100;

export function rateLimitMultiplier(env: Env = process.env): number {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") return 1;
  const raw = env.RATE_LIMIT_MULTIPLIER?.trim();
  if (raw && /^\d{1,3}$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1 && n <= MAX_MULTIPLIER) return n;
  }
  return env.NODE_ENV === "development" ? DEV_RATE_LIMIT_MULTIPLIER : 1;
}

export function scaledMaxHits(maxHits: number, env: Env = process.env): number {
  return maxHits * rateLimitMultiplier(env);
}
