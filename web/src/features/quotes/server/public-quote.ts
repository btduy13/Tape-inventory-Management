// Data for the public /q/<token> page (rate limited per IP).
import "server-only";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { toPublicQuote } from "../lib/public-view";
import { evaluateTokenAccess, type TokenAccess } from "../lib/token";
import type { PublicQuote } from "../lib/types";
import { findByRawToken } from "./token-lookup";

export type PublicQuoteResult =
  | { access: "rate_limited" }
  | { access: "invalid" }
  | { access: Exclude<TokenAccess, "invalid">; quote: PublicQuote };

export async function loadPublicQuote(rawToken: string, headers: Headers): Promise<PublicQuoteResult> {
  if (!(await checkRateLimit(headers, RATE_LIMITS.quoteView))) return { access: "rate_limited" };
  const bundle = await findByRawToken(rawToken);
  const access = evaluateTokenAccess(bundle?.token ?? null, bundle?.quote ?? null);
  if (!bundle || access === "invalid") return { access: "invalid" };
  return { access, quote: toPublicQuote(bundle.quote, bundle.lines, bundle.lead) };
}
