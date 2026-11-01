// Cloudflare Turnstile server-side verification.
import "server-only";

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export { TURNSTILE_ACTION } from "../lib/api-contract";

export interface TurnstileOptions {
  secret: string;
  /** Client IP; omitted when unknown. */
  remoteIp?: string;
  /** Expected widget action; checked only when Cloudflare returns one. */
  action?: string;
  /**
   * Hostnames the widget may be solved on (our own site). A token solved on another site
   * that embeds our sitekey is rejected. Skipped for Cloudflare test keys (action "test" or
   * metadata.result_with_testing_key).
   */
  hostnames?: readonly string[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
  metadata?: { result_with_testing_key?: boolean };
};

/** Returns true only on an explicit success from Cloudflare. Fails closed on any error. */
export async function verifyTurnstile(token: unknown, opts: TurnstileOptions): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const body = new URLSearchParams({ secret: opts.secret, response: token });
  if (opts.remoteIp && opts.remoteIp !== "unknown") body.set("remoteip", opts.remoteIp);
  try {
    const res = await (opts.fetchImpl ?? fetch)(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as SiteverifyResponse;
    if (data.success !== true) return false;
    // Test keys return action "test"; real widgets echo the configured action.
    if (opts.action && data.action && data.action !== "test" && data.action !== opts.action) {
      return false;
    }
    // Test secrets return hostname "example.com" and flag metadata.result_with_testing_key.
    const isTestKey = data.action === "test" || data.metadata?.result_with_testing_key === true;
    if (opts.hostnames && opts.hostnames.length > 0 && !isTestKey) {
      const host = (data.hostname ?? "").toLowerCase();
      if (!opts.hostnames.some((h) => h.toLowerCase() === host)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
