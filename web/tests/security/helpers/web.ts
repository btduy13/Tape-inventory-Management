// HTTP helpers for the "webapp" security suite: talk to the running Next.js app like a browser.
// LOCAL TARGETS ONLY. Base URL: SECURITY_BASE_URL (default http://localhost:3000).
//
// Server Actions are invoked the way the React client does it: POST to a page with the
// `Next-Action: <id>` header and the arguments encoded by React's encodeReply
// (root "0" = JSON args, a FormData argument = "$K1" with its entries under "_1_<name>").
// Action ids change on every build, so they are read from .next/server/server-reference-manifest.json.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resetLocalRateLimits } from "./rate-limits";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function assertLocal(name: string, value: string): string {
  const host = new URL(value).hostname;
  if (!LOCAL_HOSTS.has(host) && !host.endsWith(".localhost") && !host.endsWith(".test")) {
    throw new Error(`[security suite] ${name}=${value} is not a local host; refusing to run`);
  }
  return value.replace(/\/+$/, "");
}

export const WEB_BASE = assertLocal("SECURITY_BASE_URL", process.env.SECURITY_BASE_URL ?? "http://localhost:3000");
export const WEB_ORIGIN = new URL(WEB_BASE).origin;
export const WEB_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const NEXT_DIR = path.join(WEB_ROOT, ".next");

/**
 * One synthetic client IP per test process (198.18.0.0/15, benchmark range). Only a server
 * configured with TRUSTED_PROXY=x-real-ip reads it; the default live `next start` ignores it
 * and webFetch() clears the local login / reset / quote buckets instead.
 */
export const TEST_CLIENT_IP = `198.18.${randomBytes(1)[0]}.${1 + (randomBytes(1)[0]! % 250)}`;

/** A fresh synthetic client IP (for calls that would otherwise hit the per-IP login limit). */
export function freshClientIp(): string {
  const b = randomBytes(2);
  return `198.19.${b[0]}.${1 + (b[1]! % 250)}`;
}

export function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "x-real-ip": TEST_CLIENT_IP, ...extra };
}

/** GET (or other method) without following redirects. */
export async function webFetch(
  pathname: string,
  init: { method?: string; cookie?: string; headers?: Record<string, string>; body?: BodyInit } = {},
): Promise<Response> {
  // The live server ignores X-Real-IP (no trusted proxy): clear the shared local buckets.
  await resetLocalRateLimits();
  const headers = baseHeaders(init.headers);
  if (init.cookie) headers.cookie = init.cookie;
  return fetch(`${WEB_BASE}${pathname}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
    redirect: "manual",
  });
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------
type ManifestEntry = { filename: string; exportedName: string };

export function actionId(filename: string, exportedName: string): string {
  const file = path.join(NEXT_DIR, "server", "server-reference-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as { node: Record<string, ManifestEntry> };
  for (const [id, entry] of Object.entries(manifest.node)) {
    if (entry.filename === filename && entry.exportedName === exportedName) return id;
  }
  throw new Error(`[security suite] action ${filename}#${exportedName} not in build manifest (run npm run build)`);
}

export const ACTIONS = {
  login: () => actionId("src/features/auth/server/actions.ts", "loginAction"),
  requestReset: () => actionId("src/features/auth/server/actions.ts", "requestResetAction"),
  savePreset: () => actionId("src/features/admin/server/actions-presets.ts", "savePresetAction"),
  inviteUser: () => actionId("src/features/admin/server/actions-users.ts", "inviteUserAction"),
  updateUser: () => actionId("src/features/admin/server/actions-users.ts", "updateUserAction"),
  convertToProduction: () => actionId("src/features/admin/server/actions-production.ts", "convertToProductionAction"),
  assignLead: () => actionId("src/features/assignment/server/actions.ts", "assignLeadAction"),
} as const;

export interface ActionCall {
  /** Page the form lives on (the action POST goes to this path). */
  page: string;
  id: string;
  /** FormData fields (second argument of a useActionState action). */
  fields: Record<string, string>;
  cookie?: string;
  /** Origin header; defaults to the app's own origin. `null` omits it. */
  origin?: string | null;
  /** Overrides the synthetic client IP (X-Real-IP) for this call. */
  clientIp?: string;
}

/** Invokes a `(prevState, formData)` Server Action like the React client does. */
export async function callAction(call: ActionCall): Promise<Response> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(call.fields)) fd.append(`_1_${k}`, v);
  fd.append("0", JSON.stringify([{ status: "idle" }, "$K1"]));
  const headers: Record<string, string> = { "Next-Action": call.id, Accept: "text/x-component" };
  if (call.origin !== null) headers.Origin = call.origin ?? WEB_ORIGIN;
  if (call.clientIp) headers["x-real-ip"] = call.clientIp;
  return webFetch(call.page, { method: "POST", cookie: call.cookie, headers, body: fd });
}

/** The action's return value (row "1:" of the RSC payload), or null if none. */
export function actionResult(rscText: string): { status?: string; message?: string } | null {
  const line = rscText.split("\n").find((l) => l.startsWith("1:{"));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(2)) as { status?: string; message?: string };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Login through the app (loginAction) and cookie handling
// ---------------------------------------------------------------------------
export function cookieHeaderFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0]!)
    .filter((pair) => !pair.endsWith("="))
    .join("; ");
}

export interface LoginResponse {
  res: Response;
  body: string;
  cookie: string;
  setCookies: string[];
  /** Target of a successful login redirect (x-action-redirect without the ";push"), or null. */
  redirect: string | null;
}

export async function loginViaApp(
  email: string,
  password: string,
  next = "/portal",
  origin?: string | null,
): Promise<LoginResponse> {
  const res = await callAction({
    page: "/login",
    id: ACTIONS.login(),
    fields: { email, password, next },
    origin,
    // auth-login is 10 per 15 min per client; webFetch() clears the local bucket first.
    clientIp: freshClientIp(),
  });
  const body = await res.text();
  const header = res.headers.get("x-action-redirect");
  return {
    res,
    body,
    cookie: cookieHeaderFrom(res),
    setCookies: res.headers.getSetCookie(),
    redirect: header ? header.split(";")[0]! : null,
  };
}

const sessionCache = new Map<string, Promise<string>>();

/** Supabase session cookie for a seed user, obtained by logging in through the app. */
export function appSession(email: string, password = "devpassword123"): Promise<string> {
  let p = sessionCache.get(email);
  if (!p) {
    p = loginViaApp(email, password).then((r) => {
      if (!r.cookie.includes("auth-token")) {
        throw new Error(
          `[security suite] app login failed for ${email}: HTTP ${r.res.status} ${r.body.slice(0, 200)}`,
        );
      }
      return r.cookie;
    });
    sessionCache.set(email, p);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Hostile test data
// ---------------------------------------------------------------------------
/** HTML / attribute / script-context breakers. Every value fits the server-side limits. */
export const XSS = {
  tag: `<img src=x onerror=alert(1)>`,
  script: `</script><script>alert(1)</script>`,
  attr: `"><svg onload=alert(1)>`,
  quote: `'&"`,
} as const;

/** Raw markers that must never appear verbatim in HTML output. */
export const RAW_MARKERS = ["<img src=x onerror", "<script>alert(1)", "<svg onload", "</script><script>"] as const;

export function serviceHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) throw new Error("[security suite] SUPABASE_SERVICE_ROLE_KEY missing (web/.env.local)");
  return { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
}

export function supabaseUrl(): string {
  return assertLocal("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
}

export interface HostileLead {
  id: string;
  code: string;
  /** "api" = created through POST /api/leads; "service" = fallback insert (captcha/rate limit). */
  via: "api" | "service";
  fields: { name: string; company: string; note: string; designText: string };
}

async function firstActivePreset(): Promise<{ id: string; width_mm: number; length_m: number; thickness_mic: number }> {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/tape_presets?select=id,width_mm,length_m,thickness_mic&is_active=eq.true&limit=1`,
    { headers: serviceHeaders() },
  );
  const rows = (await res.json()) as Array<{ id: string; width_mm: number; length_m: number; thickness_mic: number }>;
  if (!rows[0]) throw new Error("[security suite] no active tape preset");
  return rows[0];
}

/**
 * Creates a lead whose customer-controlled text fields carry XSS payloads.
 * Tries the public POST /api/leads first (Turnstile test keys); when the app refuses
 * (captcha unreachable offline, rate limit) it inserts the same values with the service key.
 */
export async function createHostileLead(tag = randomBytes(3).toString("hex")): Promise<HostileLead> {
  const fields = {
    name: `Sec${tag} ${XSS.tag}${XSS.quote}`,
    company: `Co${tag} ${XSS.attr}`,
    note: `Note${tag} ${XSS.script} ${XSS.tag}`,
    designText: `T${tag}${XSS.tag}`.slice(0, 60),
  };
  const preset = await firstActivePreset();
  const design = {
    version: 1,
    presetId: preset.id,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    accentColor: null,
    text: fields.designText,
    logo: null,
  };

  const fd = new FormData();
  fd.append("name", fields.name);
  fd.append("phone", "0912345678");
  fd.append("email", "");
  fd.append("company", fields.company);
  fd.append("quantity", "100");
  fd.append("note", fields.note);
  fd.append("design", JSON.stringify(design));
  fd.append("turnstileToken", "XXXX.DUMMY.TOKEN.XXXX");
  const api = await webFetch("/api/leads", { method: "POST", headers: { Origin: WEB_ORIGIN }, body: fd });
  if (api.status === 201) {
    const { code } = (await api.json()) as { code: string };
    const rows = (await (
      await fetch(`${supabaseUrl()}/rest/v1/leads?select=id,code&code=eq.${encodeURIComponent(code)}`, {
        headers: serviceHeaders(),
      })
    ).json()) as Array<{ id: string; code: string }>;
    if (rows[0]) return { ...rows[0], via: "api", fields };
  }

  const leadRes = await fetch(`${supabaseUrl()}/rest/v1/leads`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({
      customer_name: fields.name,
      phone: "0912345678",
      company: fields.company,
      quantity: 100,
      customer_note: fields.note,
    }),
  });
  if (!leadRes.ok) throw new Error(`[security suite] lead insert failed: ${leadRes.status} ${await leadRes.text()}`);
  const [lead] = (await leadRes.json()) as Array<{ id: string; code: string }>;
  const designRes = await fetch(`${supabaseUrl()}/rest/v1/designs`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      lead_id: lead!.id,
      preset_id: preset.id,
      width_mm: preset.width_mm,
      length_m: preset.length_m,
      thickness_mic: preset.thickness_mic,
      colors: ["#ffffff", "#000000"],
      print_text: fields.designText,
      design_json: design,
    }),
  });
  if (!designRes.ok) throw new Error(`[security suite] design insert failed: ${designRes.status}`);
  return { id: lead!.id, code: lead!.code, via: "service", fields };
}

export async function deleteLead(id: string): Promise<void> {
  await fetch(`${supabaseUrl()}/rest/v1/leads?id=eq.${id}`, { method: "DELETE", headers: serviceHeaders() });
}

/** Values of server secrets from the env (never printed by the suite). */
export function serverSecretValues(): Array<{ name: string; value: string }> {
  const names = ["SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY", "IP_HASH_SALT", "RESEND_API_KEY"];
  return names
    .map((name) => ({ name, value: process.env[name] ?? "" }))
    .filter((s) => s.value.length >= 16);
}
