// Server-only secrets. Importing this from a Client Component fails the build.
import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  // SMTP, same settings as the desktop app (electron/config.js). When SMTP_SERVER is set it wins over Resend.
  SMTP_SERVER: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USERNAME: z.string().trim().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_SENDER: z.string().trim().default(""),
  EMAIL_FROM: z.string().min(3).default("Băng Keo <no-reply@example.com>"),
  ADMIN_NOTIFY_EMAILS: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((e) => e.trim()).filter(Boolean)),
  // Cloudflare "always passes" test secret by default (local dev only).
  TURNSTILE_SECRET_KEY: z.string().min(1).default("1x0000000000000000000000000000000AA"),
  // Salt for hashing client IPs (rate limit keys, leads.source_ip_hash).
  IP_HASH_SALT: z.string().min(16).default("dev-only-salt-change-me"), // rejected in production
  QUOTE_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

// Cloudflare Turnstile dummy secrets (1x = always pass, 2x = always fail, 3x = token spent).
const TURNSTILE_TEST_SECRET = /^[123]x0+AA$/;
const DEV_SALT = "dev-only-salt-change-me";

type RuntimeEnv = Record<string, string | undefined>;

/**
 * True for a real production deployment: Vercel production, or a self-hosted
 * `next start` (NODE_ENV=production) that did not explicitly opt into test secrets.
 * Vercel preview deployments may keep the Turnstile test keys.
 */
export function isProductionRuntime(env: RuntimeEnv): boolean {
  if (env.VERCEL_ENV) return env.VERCEL_ENV === "production";
  return env.NODE_ENV === "production" && env.ALLOW_TEST_SECRETS !== "1";
}

/**
 * Fail closed instead of silently running production with the always-pass Turnstile
 * secret or a publicly known IP-hash salt (both are schema defaults for local dev).
 */
export function assertProductionSecrets(parsed: ServerEnv, env: RuntimeEnv): void {
  if (!isProductionRuntime(env)) return;
  const problems: string[] = [];
  if (TURNSTILE_TEST_SECRET.test(parsed.TURNSTILE_SECRET_KEY)) {
    problems.push("TURNSTILE_SECRET_KEY is a Cloudflare test secret");
  }
  if (parsed.IP_HASH_SALT === DEV_SALT || parsed.IP_HASH_SALT.startsWith("change-me")) {
    problems.push("IP_HASH_SALT is the default/example value");
  }
  if (problems.length > 0) {
    throw new Error(`Insecure production configuration: ${problems.join("; ")}`);
  }
}

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.parse(process.env);
  assertProductionSecrets(parsed, process.env);
  cached = parsed;
  return cached;
}
