// Browser call to POST /api/leads with a safe response parser.
import { ROUTES } from "@/lib/routes";
import type { LeadFieldName, LeadSubmitResponse } from "./api-contract";
import { isLeadErrorCode } from "./error-message";

export type SubmitResult = LeadSubmitResponse | { ok: false; error: "network" };

export function parseLeadResponse(status: number, body: unknown): LeadSubmitResponse {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.ok === true && typeof b.code === "string") return { ok: true, code: b.code };
    if (b.ok === false && isLeadErrorCode(b.error)) {
      const fields = b.fields && typeof b.fields === "object"
        ? (b.fields as Partial<Record<LeadFieldName, string>>)
        : undefined;
      return fields ? { ok: false, error: b.error, fields } : { ok: false, error: b.error };
    }
  }
  if (status === 429) return { ok: false, error: "rate_limited" };
  if (status === 413) return { ok: false, error: "too_large" };
  return { ok: false, error: "server" };
}

export async function submitLead(
  body: FormData,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetchImpl(ROUTES.api.leads, { method: "POST", body, credentials: "same-origin" });
  } catch {
    return { ok: false, error: "network" };
  }
  const json: unknown = await res.json().catch(() => null);
  return parseLeadResponse(res.status, json);
}
