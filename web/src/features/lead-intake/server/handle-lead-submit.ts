// POST /api/leads orchestration. All I/O is injected (see deps.ts) so it is unit-testable.
// Order: same-origin -> declared size -> rate limit -> body cap -> honeypot -> Turnstile -> zod/files -> DB -> email.
import "server-only";
import {
  LEAD_ERROR_STATUS,
  LEAD_FIELDS,
  MAX_BODY_BYTES,
  type LeadErrorCode,
  type LeadSubmitResponse,
} from "../lib/api-contract";
import type { LeadNotifier } from "../lib/email-contract";
import type { LeadStore } from "./lead-store";
import { parseSubmission } from "./parse-submission";
import { BodyTooLargeError, declaresTooLarge, discardBody, readFormDataCapped } from "./read-body";
import { InvalidTapeSizeError, saveLead } from "./save-lead";
import { notifyNewLead, toEmailData } from "./notify";

export interface LeadSubmitDeps {
  isSameOrigin(req: Request): boolean;
  checkRateLimit(headers: Headers): Promise<boolean>;
  verifyCaptcha(token: unknown, headers: Headers): Promise<boolean>;
  hashClientIp(headers: Headers): Promise<string | null>;
  store: LeadStore;
  notifier: LeadNotifier;
}

const NO_STORE = { "cache-control": "no-store" };

export function jsonResponse(body: LeadSubmitResponse, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function errorResponse(error: LeadErrorCode, fields?: Record<string, string>): Response {
  return jsonResponse(fields ? { ok: false, error, fields } : { ok: false, error }, LEAD_ERROR_STATUS[error]);
}

export async function handleLeadSubmit(req: Request, deps: LeadSubmitDeps): Promise<Response> {
  if (!deps.isSameOrigin(req)) return errorResponse("csrf");
  // Answer an oversized declared body at once, before any DB work and without reading it.
  if (declaresTooLarge(req, MAX_BODY_BYTES)) {
    discardBody(req, 2 * MAX_BODY_BYTES);
    return errorResponse("too_large");
  }
  if (!(await deps.checkRateLimit(req.headers))) return errorResponse("rate_limited");

  let form: FormData;
  try {
    form = await readFormDataCapped(req, MAX_BODY_BYTES);
  } catch (err) {
    if (!(err instanceof BodyTooLargeError)) return errorResponse("validation");
    discardBody(req, 2 * MAX_BODY_BYTES);
    return errorResponse("too_large");
  }

  // Bots that fill the hidden field get a fake success and nothing is stored.
  const trap = form.get(LEAD_FIELDS.honeypot);
  if (typeof trap === "string" && trap.trim() !== "") {
    return jsonResponse({ ok: true, code: "" }, 201);
  }

  if (!(await deps.verifyCaptcha(form.get(LEAD_FIELDS.turnstileToken), req.headers))) {
    return errorResponse("captcha");
  }

  const parsed = await parseSubmission(form);
  if (!parsed.ok) return jsonResponse(parsed.response, LEAD_ERROR_STATUS[parsed.response.error]);

  try {
    const saved = await saveLead(deps.store, parsed.value, {
      ipHash: await deps.hashClientIp(req.headers),
      userAgent: req.headers.get("user-agent"),
    });
    await notifyNewLead(deps.notifier, toEmailData(saved, parsed.value));
    return jsonResponse({ ok: true, code: saved.code }, 201);
  } catch (err) {
    if (err instanceof InvalidTapeSizeError) return errorResponse("tape_size");
    console.error("[lead-intake] save failed:", err instanceof Error ? err.message : "unknown");
    return errorResponse("server");
  }
}
