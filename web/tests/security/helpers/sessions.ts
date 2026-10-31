// Signed-in clients built from cached access tokens.
// GoTrue limits password sign-ins (config.toml: sign_in_sign_ups = 30 per 5 min per IP), and
// every test file runs in its own worker. Tokens are therefore cached in a file under the OS
// temp dir (shared by all workers and suites) and reused while they stay valid.
// The client acts through the anon key + user JWT on PostgREST, Storage and Realtime.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ANON_KEY, SEED_PASSWORD, SEED_USERS, SUPABASE_URL, type SeedRole } from "./env";

/** Loosely typed client: security tests call tables/RPCs that are deliberately not in `Database`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseDb = SupabaseClient<any, "public", "public", any, any>;

/** Seed profile ids (supabase/seed.sql). */
export const SEED_IDS: Record<SeedRole, string> = {
  admin: "00000000-0000-0000-0000-00000000a001",
  manager: "00000000-0000-0000-0000-00000000a002",
  staff: "00000000-0000-0000-0000-00000000a003",
  ctv: "00000000-0000-0000-0000-00000000a004",
  staff2: "00000000-0000-0000-0000-00000000a005",
};

/** Seed leads: b0001 -> staff, b0002 -> ctv, b0003 unassigned. */
export const SEED_LEADS = {
  staff: "00000000-0000-0000-0000-0000000b0001",
  ctv: "00000000-0000-0000-0000-0000000b0002",
  unassigned: "00000000-0000-0000-0000-0000000b0003",
} as const;

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

export function looseAnon(): LooseDb {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: NO_SESSION }) as LooseDb;
}

/** Client acting as the given user JWT (PostgREST, Storage, Realtime). */
export function tokenClient(accessToken: string): LooseDb {
  return createClient(SUPABASE_URL, ANON_KEY, { accessToken: async () => accessToken }) as LooseDb;
}

type CacheEntry = { token: string; expiresAt: number; userId: string };

const CACHE_DIR = path.join(os.tmpdir(), "tape-security-tests");
const CACHE_FILE = path.join(CACHE_DIR, "sessions.json");
const LOCK_DIR = path.join(CACHE_DIR, "sessions.lock");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const tmp = `${CACHE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache));
  fs.renameSync(tmp, CACHE_FILE);
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(LOCK_DIR);
      break;
    } catch {
      try {
        if (Date.now() - fs.statSync(LOCK_DIR).mtimeMs > 60_000) fs.rmSync(LOCK_DIR, { recursive: true, force: true });
      } catch {
        /* lock released between the two calls */
      }
      if (Date.now() - started > 240_000) throw new Error("[security suite] session lock timeout");
      await sleep(150);
    }
  }
  try {
    return await fn();
  } finally {
    fs.rmSync(LOCK_DIR, { recursive: true, force: true });
  }
}

const keyOf = (email: string) => `${SUPABASE_URL}|${email.toLowerCase()}`;
const isFresh = (e: CacheEntry | undefined): e is CacheEntry => !!e && e.expiresAt * 1000 > Date.now() + 5 * 60_000;

/** Password sign-in with a shared token cache and back-off on GoTrue's 429. */
export async function signInCached(email: string, password: string): Promise<{ token: string; userId: string }> {
  const hit = readCache()[keyOf(email)];
  if (isFresh(hit)) return { token: hit.token, userId: hit.userId };
  return withLock(async () => {
    const again = readCache()[keyOf(email)];
    if (isFresh(again)) return { token: again.token, userId: again.userId };
    const auth = looseAnon().auth;
    for (let attempt = 0; ; attempt++) {
      const { data, error } = await auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        const entry: CacheEntry = {
          token: data.session.access_token,
          expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3000,
          userId: data.session.user.id,
        };
        writeCache({ ...readCache(), [keyOf(email)]: entry });
        return { token: entry.token, userId: entry.userId };
      }
      const limited = error?.status === 429 || /rate limit/i.test(error?.message ?? "");
      if (!limited || attempt >= 16) {
        throw new Error(`[security suite] sign-in failed for ${email}: ${error?.message ?? "no session"}`);
      }
      await sleep(20_000);
    }
  });
}

export function forgetCachedSession(email: string): void {
  const cache = readCache();
  delete cache[keyOf(email)];
  writeCache(cache);
}

export type Actor = { name: string; email: string; id: string; db: LooseDb; token: string };

export async function actorFor(name: string, email: string, password: string): Promise<Actor> {
  const { token, userId } = await signInCached(email, password);
  return { name, email, id: userId, db: tokenClient(token), token };
}

/** Seed account as an actor (token cached across workers). */
export function seedActor(role: SeedRole): Promise<Actor> {
  return actorFor(role, SEED_USERS[role], SEED_PASSWORD);
}
