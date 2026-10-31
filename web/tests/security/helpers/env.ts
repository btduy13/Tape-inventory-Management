// Shared environment for the security suite. LOCAL TARGETS ONLY: every URL is checked
// so a misconfigured env can never point the suite at a remote or production host.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function requireLocal(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[security suite] missing env ${name} (expected in web/.env.local)`);
  const host = new URL(value).hostname;
  if (!LOCAL_HOSTS.has(host) && !host.endsWith(".localhost") && !host.endsWith(".test")) {
    throw new Error(`[security suite] ${name}=${value} is not a local host; refusing to run`);
  }
  return value.replace(/\/+$/, "");
}

export const BASE_URL = requireLocal("SECURITY_BASE_URL", process.env.SECURITY_BASE_URL ?? "http://localhost:3000");
export const BASE_ORIGIN = new URL(BASE_URL).origin;
export const SUPABASE_URL = requireLocal("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Seed accounts from supabase/SEED_USERS.md (local Docker Supabase only). */
export const SEED_PASSWORD = "devpassword123";
export const SEED_USERS = {
  admin: "admin@local.test",
  manager: "manager@local.test",
  staff: "staff@local.test",
  staff2: "staff2@local.test",
  ctv: "ctv@local.test",
} as const;
export type SeedRole = keyof typeof SEED_USERS;
