"use server";
// "Send quote" action (admin/manager): PDF + one-time customer link + email.
import { createClient } from "@/lib/supabase/server";
import { vi } from "@/i18n/vi";
import { uuidSchema } from "../lib/schemas";
import type { ActionResult } from "../lib/types";
import { fail, guarded, PRICING, revalidateLead, sendErrorMessage } from "./action-utils";
import { createSendDeps } from "./send-deps";
import { sendQuote } from "./send-quote";

export async function sendQuoteAction(
  quoteId: string,
): Promise<ActionResult<{ sentAt: string; linkExpiresAt: string }>> {
  return guarded(PRICING, async () => {
    const id = uuidSchema.safeParse(quoteId);
    if (!id.success) return fail(vi.common.errorValidation);
    const db = await createClient();
    const deps = createSendDeps(db);
    const ctx = await deps.loadContext(id.data);
    if (!ctx) return fail(vi.common.errorForbidden);
    const res = await sendQuote({ ...deps, loadContext: async () => ctx }, id.data);
    revalidateLead(ctx.lead.id);
    if (!res.ok) return fail(sendErrorMessage(res.error));
    return { ok: true, data: { sentAt: res.sentAt, linkExpiresAt: res.linkExpiresAt } };
  });
}
