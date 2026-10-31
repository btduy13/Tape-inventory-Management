// Shared helpers for quote server actions: role gate, error mapping, revalidation.
import "server-only";
import { revalidatePath } from "next/cache";
import { vi } from "@/i18n/vi";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROUTES } from "@/lib/routes";
import type { AppRole, Profile } from "@/lib/types";
import type { ActionResult } from "../lib/types";
import type { SendError } from "./send-quote";

export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Runs `fn` after the role check; maps thrown errors to a safe Vietnamese message. */
export async function guarded<T>(
  roles: readonly AppRole[],
  fn: (profile: Profile) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const profile = await assertRole(roles);
    return await fn(profile);
  } catch (err) {
    if (err instanceof ForbiddenError) return fail(vi.common.errorForbidden);
    // Postgres insufficient_privilege from guard triggers (e.g. quote locked).
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42501") {
      return fail(vi.quotes.errLocked);
    }
    console.error("[quotes] action failed", err instanceof Error ? err.message : err);
    return fail(vi.common.errorGeneric);
  }
}

export const PRICING = ROLE_GROUPS.pricing;
export const INTERNAL = ROLE_GROUPS.internal;

export function revalidateLead(leadId: string): void {
  revalidatePath(ROUTES.portalLead(leadId));
  revalidatePath(ROUTES.adminLead(leadId));
}

const SEND_ERRORS: Record<SendError, string> = {
  not_found: vi.common.errorForbidden,
  not_sendable: vi.quotes.errNotSendable,
  no_lines: vi.quotes.errNoLines,
  zero_total: vi.quotes.errZeroTotal,
  no_customer_email: vi.quotes.errNoEmail,
  pdf_failed: vi.quotes.errPdfFailed,
  email_failed: vi.quotes.errEmailFailed,
  store_failed: vi.common.errorGeneric,
};

export const sendErrorMessage = (e: SendError) => SEND_ERRORS[e];

/** Throw supabase errors with their Postgres code preserved (for 42501 mapping). */
export function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data;
}

/** Like check(), for `.single()` results: a missing row is an error too. */
export function checkOne<T>(res: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  const data = check(res);
  if (data === null || data === undefined) throw new Error("row not returned");
  return data as NonNullable<T>;
}
