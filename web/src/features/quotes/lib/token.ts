// Customer link tokens: crypto-random raw token (email only), sha256 hex stored in DB.
import { randomToken, sha256Hex } from "@/lib/security/hash";
import type { QuoteStatus } from "@/lib/types";

export interface NewQuoteToken {
  /** Raw token: goes ONLY into the customer email link. Never stored or logged. */
  token: string;
  tokenHash: string;
  expiresAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function createQuoteToken(ttlDays: number, now: Date = new Date()): Promise<NewQuoteToken> {
  const token = randomToken(32);
  return {
    token,
    tokenHash: await sha256Hex(token),
    expiresAt: new Date(now.getTime() + ttlDays * DAY_MS).toISOString(),
  };
}

export const hashQuoteToken = (token: string) => sha256Hex(token);

export type TokenAccess =
  /** Customer may view and respond. */
  | "open"
  /** Already answered with this link: read-only view. */
  | "used"
  /** Unknown, revoked without answer, link expired, or quote withdrawn. */
  | "invalid"
  /** Quote validity date passed: read-only, cannot accept. */
  | "quote_expired";

export interface TokenRowLike {
  expires_at: string;
  revoked_at: string | null;
}

export interface QuoteStateLike {
  status: QuoteStatus;
  valid_until: string | null;
}

/** End of the valid_until day in Vietnam (UTC+7). */
export function validUntilEnd(validUntil: string): number {
  return Date.parse(`${validUntil}T23:59:59.999+07:00`);
}

export function evaluateTokenAccess(
  token: TokenRowLike | null,
  quote: QuoteStateLike | null,
  now: Date = new Date(),
): TokenAccess {
  if (!token || !quote) return "invalid";
  const answered = quote.status === "accepted" || quote.status === "changes_requested";
  // Expiry first: an answered link must not show the quote (names, prices) forever.
  if (!(Date.parse(token.expires_at) > now.getTime())) return "invalid";
  if (token.revoked_at) return answered ? "used" : "invalid";
  if (answered) return "used";
  if (quote.status !== "sent") return "invalid";
  if (quote.valid_until && validUntilEnd(quote.valid_until) < now.getTime()) return "quote_expired";
  return "open";
}
