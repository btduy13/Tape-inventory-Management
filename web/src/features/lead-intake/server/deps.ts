// Production wiring of LeadSubmitDeps (service-role client, Turnstile, rate limit, email).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env.server";
import { isSameOriginRequest } from "@/lib/security/csrf";
import { checkRateLimit, clientIp, hashIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import type { LeadSubmitDeps } from "./handle-lead-submit";
import { createSupabaseLeadStore } from "./lead-store";
import { emailLeadNotifier } from "./email-notifier";
import { TURNSTILE_ACTION, verifyTurnstile } from "./turnstile";

/**
 * Our own hostnames for the Turnstile hostname check: the canonical site + the Host this
 * request was routed to (the platform only routes our own domains, e.g. www / apex).
 */
export function siteHostnames(host: string | null): string[] {
  const out = new Set<string>();
  for (const raw of [process.env.NEXT_PUBLIC_SITE_URL, host ? `https://${host}` : undefined]) {
    if (!raw) continue;
    try {
      out.add(new URL(raw).hostname.toLowerCase());
    } catch {
      /* ignore malformed */
    }
  }
  return [...out];
}

export function createLeadSubmitDeps(): LeadSubmitDeps {
  return {
    isSameOrigin: (req) => isSameOriginRequest(req, process.env.NEXT_PUBLIC_SITE_URL),
    checkRateLimit: (headers) => checkRateLimit(headers, RATE_LIMITS.leadSubmit),
    verifyCaptcha: (token, headers) =>
      verifyTurnstile(token, {
        secret: serverEnv().TURNSTILE_SECRET_KEY,
        remoteIp: clientIp(headers),
        action: TURNSTILE_ACTION,
        hostnames: siteHostnames(headers.get("host")),
      }),
    hashClientIp: async (headers) => {
      const ip = clientIp(headers);
      return ip === "unknown" ? null : hashIp(ip);
    },
    store: createSupabaseLeadStore(createAdminClient()),
    notifier: emailLeadNotifier,
  };
}
