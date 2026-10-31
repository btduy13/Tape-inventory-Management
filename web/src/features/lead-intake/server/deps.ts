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

export function createLeadSubmitDeps(): LeadSubmitDeps {
  return {
    isSameOrigin: (req) => isSameOriginRequest(req, process.env.NEXT_PUBLIC_SITE_URL),
    checkRateLimit: (headers) => checkRateLimit(headers, RATE_LIMITS.leadSubmit),
    verifyCaptcha: (token, headers) =>
      verifyTurnstile(token, {
        secret: serverEnv().TURNSTILE_SECRET_KEY,
        remoteIp: clientIp(headers),
        action: TURNSTILE_ACTION,
      }),
    hashClientIp: async (headers) => {
      const ip = clientIp(headers);
      return ip === "unknown" ? null : hashIp(ip);
    },
    store: createSupabaseLeadStore(createAdminClient()),
    notifier: emailLeadNotifier,
  };
}
