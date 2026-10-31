// Lead-intake (POST /api/leads) helpers for the security suite.
//
// Two ways to hit the endpoint:
//   * LIVE: HTTP against BASE_URL. Everything BEFORE Turnstile (same-origin, rate limit, body cap,
//     token presence) can be tested this way. Turnstile siteverify needs internet; when it is not
//     reachable the live server fails closed, so live requests never get past the captcha.
//   * IN-PROCESS: the real route orchestration (handleLeadSubmit) with the real production deps
//     (createLeadSubmitDeps: service-role store on the LOCAL Supabase, DB rate limit, IP hash,
//     email notifier) and only Cloudflare's siteverify replaced by a fake that reproduces the
//     documented behaviour of Cloudflare's dummy secrets (1x.. pass, 2x.. fail, 3x.. spent).
import { randomBytes } from "node:crypto";
import { request as httpRequest } from "node:http";
import { DESIGN, PNG_BYTES } from "@/features/lead-intake/testing/fixtures";
import { handleLeadSubmit } from "@/features/lead-intake/server/handle-lead-submit";
import { createLeadSubmitDeps, siteHostnames } from "@/features/lead-intake/server/deps";
import { TURNSTILE_ACTION, verifyTurnstile } from "@/features/lead-intake/server/turnstile";
import { clientIp } from "@/lib/security/client-ip";
import { FakeSender, setEmailSender } from "@/features/email";
import type { EmailMessage } from "@/features/email";
import { serviceClient } from "./clients";
import { BASE_ORIGIN, BASE_URL } from "./env";
import { randomIp } from "./http";
import { resetLocalRateLimits } from "./rate-limits";

export const LEADS_PATH = "/api/leads";
export const INTAKE_TAG = "SECTEST-intake";
export const MB = 1024 * 1024;

/** Cloudflare Turnstile dummy secrets (documented test keys). */
export const TURNSTILE_SECRETS = {
  alwaysPass: "1x0000000000000000000000000000000AA",
  alwaysFail: "2x0000000000000000000000000000000AA",
  tokenSpent: "3x0000000000000000000000000000000AA",
} as const;
export const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

export const uniqueTag = () => `${INTAKE_TAG}-${randomBytes(4).toString("hex")}`;

// ---------------------------------------------------------------------------
// Form building
// ---------------------------------------------------------------------------

let presetIdCache: string | null = null;

/** Id of an active tape preset in the local DB (the design must reference one). */
export async function activePresetId(): Promise<string> {
  if (presetIdCache) return presetIdCache;
  const { data, error } = await serviceClient()
    .from("tape_presets")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (error || !data) throw new Error(`[intake] no active preset in local DB: ${error?.message}`);
  presetIdCache = data.id;
  return data.id;
}

export async function validDesignJson(overrides: Record<string, unknown> = {}): Promise<string> {
  return JSON.stringify({ ...DESIGN, presetId: await activePresetId(), ...overrides });
}

export type FileSpec = { bytes: Uint8Array | string; name?: string; type?: string };
export type FormValue = string | FileSpec | null;

/** Valid quote-request form. `null` removes a field; FileSpec adds a file part. */
export async function leadForm(overrides: Record<string, FormValue> = {}): Promise<FormData> {
  const base: Record<string, FormValue> = {
    name: `${uniqueTag()} Nguyen Van A`,
    phone: "0912 345 678",
    email: "",
    company: "Cong ty ABC",
    quantity: "1000",
    note: "Can gap",
    design: await validDesignJson(),
    turnstileToken: DUMMY_TOKEN,
    ...overrides,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) {
    if (v === null) continue;
    if (typeof v === "string") fd.append(k, v);
    else {
      const bytes = typeof v.bytes === "string" ? new TextEncoder().encode(v.bytes) : v.bytes;
      fd.append(k, new Blob([bytes as BlobPart], { type: v.type ?? "application/octet-stream" }), v.name ?? `${k}.bin`);
    }
  }
  return fd;
}

export const pngFile = (name = "logo.png"): FileSpec => ({ bytes: PNG_BYTES, name, type: "image/png" });
export const svgFile = (svg: string, name = "logo.svg"): FileSpec => ({ bytes: svg, name, type: "image/svg+xml" });

// ---------------------------------------------------------------------------
// In-process submission (real deps, fake Cloudflare)
// ---------------------------------------------------------------------------

export type SiteverifyReply = { success: boolean; action?: string; hostname?: string; "error-codes"?: string[] };

/** Fake siteverify with the documented semantics of Cloudflare's dummy secrets. */
export function fakeCloudflare(override?: SiteverifyReply) {
  const calls: { secret: string; response: string; remoteip: string | null }[] = [];
  const impl = (async (_url: unknown, init?: RequestInit) => {
    const body = new URLSearchParams(String(init?.body ?? ""));
    const secret = body.get("secret") ?? "";
    calls.push({ secret, response: body.get("response") ?? "", remoteip: body.get("remoteip") });
    let reply: SiteverifyReply;
    if (override) reply = override;
    else if (secret === TURNSTILE_SECRETS.alwaysPass) reply = { success: true, action: "test", hostname: "example.com" };
    else if (secret === TURNSTILE_SECRETS.tokenSpent) reply = { success: false, "error-codes": ["timeout-or-duplicate"] };
    else reply = { success: false, "error-codes": ["invalid-input-response"] };
    return new Response(JSON.stringify(reply), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { impl, calls };
}

export interface InProcessOptions {
  /** Client IP the trusted edge would report (x-real-ip). Default: fresh random IP. */
  ip?: string;
  /** Turnstile secret the server is configured with. Default: always-pass dummy secret. */
  secret?: string;
  /** Force a siteverify reply (e.g. a real-key success for another hostname). */
  siteverify?: SiteverifyReply;
  headers?: Record<string, string>;
}

export interface SubmitResult {
  status: number;
  body: { ok: boolean; code?: string; error?: string; fields?: Record<string, string> };
  ip: string;
  siteverifyCalls: ReturnType<typeof fakeCloudflare>["calls"];
}

const createdCodes = new Set<string>();

export async function submitInProcess(form: FormData, opts: InProcessOptions = {}): Promise<SubmitResult> {
  const ip = opts.ip ?? randomIp();
  const cf = fakeCloudflare(opts.siteverify);
  const secret = opts.secret ?? TURNSTILE_SECRETS.alwaysPass;
  const deps = {
    ...createLeadSubmitDeps(),
    verifyCaptcha: (token: unknown, headers: Headers) =>
      verifyTurnstile(token, {
        secret,
        remoteIp: clientIp(headers),
        action: TURNSTILE_ACTION,
        hostnames: siteHostnames(headers.get("host")),
        fetchImpl: cf.impl,
      }),
  };
  const req = new Request(`${BASE_ORIGIN}${LEADS_PATH}`, {
    method: "POST",
    body: form,
    headers: { origin: BASE_ORIGIN, host: new URL(BASE_ORIGIN).host, "x-real-ip": ip, ...opts.headers },
  });
  const res = await handleLeadSubmit(req, deps);
  const body = (await res.json()) as SubmitResult["body"];
  if (body.ok && body.code) createdCodes.add(body.code);
  return { status: res.status, body, ip, siteverifyCalls: cf.calls };
}

// ---------------------------------------------------------------------------
// DB / storage inspection + cleanup
// ---------------------------------------------------------------------------

export async function leadByCode(code: string) {
  const { data, error } = await serviceClient().from("leads").select("*").eq("code", code).single();
  if (error || !data) throw new Error(`[intake] lead ${code} not found: ${error?.message}`);
  return data;
}

export async function designOfLead(leadId: string) {
  const { data, error } = await serviceClient().from("designs").select("*").eq("lead_id", leadId).single();
  if (error || !data) throw new Error(`[intake] design of ${leadId} not found: ${error?.message}`);
  return data;
}

export async function leadsWithNameLike(fragment: string) {
  const { data, error } = await serviceClient().from("leads").select("id, code").ilike("customer_name", `%${fragment}%`);
  if (error) throw new Error(`[intake] lead search failed: ${error.message}`);
  return data ?? [];
}

/** Objects under `<leadId>/` in a bucket (name + stored mimetype). */
export async function storedObjects(bucket: "logos" | "previews", leadId: string) {
  const { data, error } = await serviceClient().storage.from(bucket).list(leadId);
  if (error) throw new Error(`[intake] list ${bucket}/${leadId}: ${error.message}`);
  return (data ?? []).map((o) => ({
    path: `${leadId}/${o.name}`,
    mimetype: (o.metadata as { mimetype?: string } | null)?.mimetype ?? null,
  }));
}

export async function downloadText(bucket: "logos" | "previews", path: string): Promise<string> {
  const { data, error } = await serviceClient().storage.from(bucket).download(path);
  if (error || !data) throw new Error(`[intake] download ${bucket}/${path}: ${error?.message}`);
  return await data.text();
}

/** Deletes every lead created through submitInProcess (files first, lead cascades designs). */
export async function cleanupIntakeData(): Promise<void> {
  const db = serviceClient();
  const codes = [...createdCodes];
  createdCodes.clear();
  const { data: rows } = await db.from("leads").select("id").or(
    [`customer_name.ilike.%${INTAKE_TAG}%`, ...(codes.length ? [`code.in.(${codes.join(",")})`] : [])].join(","),
  );
  for (const { id } of rows ?? []) {
    for (const bucket of ["logos", "previews"] as const) {
      const { data } = await db.storage.from(bucket).list(id);
      if (data?.length) await db.storage.from(bucket).remove(data.map((o) => `${id}/${o.name}`));
    }
    await db.from("leads").delete().eq("id", id);
  }
}

// ---------------------------------------------------------------------------
// Email capture (the notifier runs in-process; capture what it would send)
// ---------------------------------------------------------------------------

export function captureEmails(): { sent: EmailMessage[]; restore: () => void } {
  const sender = new FakeSender();
  setEmailSender(sender);
  return { sent: sender.sent, restore: () => setEmailSender(null) };
}

// ---------------------------------------------------------------------------
// Live helpers
// ---------------------------------------------------------------------------

/**
 * Clears the lead-submit rate-limit rows of the addresses a header-less local client can map
 * to, so a live test starts from an empty window. Only touches `lead-submit:` keys.
 */
export async function resetLocalLeadRateLimit(): Promise<void> {
  await resetLocalRateLimits(["lead-submit"]);
}

/** Live multipart POST with exact header control (no default x-real-ip). */
export async function postLeadLive(form: FormData, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${LEADS_PATH}`, {
    method: "POST",
    body: form,
    headers: { origin: BASE_ORIGIN, ...headers },
    redirect: "manual",
  });
  const text = await res.text();
  let json: { ok?: boolean; error?: string } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, json, text };
}

/**
 * Raw HTTP request that declares `declaredLength` bytes but only sends `sendBytes`, then waits
 * for the server to answer. Resolves with the status (or "timeout" if the server keeps waiting
 * for the rest of the body).
 */
export function postDeclaredLength(
  declaredLength: number,
  sendBytes: number,
  timeoutMs = 5000,
  headers: Record<string, string> = {},
): Promise<{ status: number | "timeout"; ms: number }> {
  const url = new URL(`${BASE_URL}${LEADS_PATH}`);
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          origin: BASE_ORIGIN,
          "content-type": "multipart/form-data; boundary=----sectest",
          "content-length": String(declaredLength),
          ...headers,
        },
      },
      (res) => {
        res.resume();
        clearTimeout(timer);
        resolve({ status: res.statusCode ?? 0, ms: Date.now() - started });
        req.destroy();
      },
    );
    const timer = setTimeout(() => {
      req.destroy();
      resolve({ status: "timeout", ms: Date.now() - started });
    }, timeoutMs);
    req.on("error", (e) => {
      // A server that answers early and closes the socket can surface as EPIPE/ECONNRESET here.
      if (Date.now() - started >= timeoutMs) return;
      if ((e as NodeJS.ErrnoException).code === "EPIPE" || (e as NodeJS.ErrnoException).code === "ECONNRESET") return;
      clearTimeout(timer);
      reject(e);
    });
    req.write(Buffer.alloc(sendBytes, 0x61));
    // body intentionally left incomplete
  });
}

/** Fails fast with a clear message when the target server cannot serve /api/leads at all. */
export async function assertLiveIntakeUp(): Promise<void> {
  const res = await fetch(`${BASE_URL}${LEADS_PATH}`, { method: "POST", headers: { origin: "https://evil.example" } });
  if (res.status === 500) {
    throw new Error(
      `[intake] ${BASE_URL}${LEADS_PATH} answers 500 before any check. A production build started without ` +
        "ALLOW_TEST_SECRETS=1 refuses the local Turnstile test secret (W2, by design). Start a local server with " +
        "ALLOW_TEST_SECRETS=1 and set SECURITY_BASE_URL to it.",
    );
  }
}
