// Service-role wiring for respondToQuote(). Only reachable through the rate-limited,
// same-origin-checked route handler.
import "server-only";
import { sendCustomerRespondedEmail } from "@/features/email";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RespondDeps } from "./respond";
import { findByRawToken } from "./token-lookup";

export function createRespondDeps(): RespondDeps {
  const db = () => createAdminClient();
  return {
    find: findByRawToken,
    async consumeToken(tokenId, nowIso) {
      const { data, error } = await db()
        .from("quote_tokens")
        .update({ revoked_at: nowIso, last_used_at: nowIso })
        .eq("id", tokenId)
        .is("revoked_at", null)
        .gt("expires_at", nowIso)
        .select("id");
      return !error && (data?.length ?? 0) === 1;
    },
    async markResponded(quoteId, status, note, nowIso) {
      const { data, error } = await db()
        .from("quotes")
        .update({ status, responded_at: nowIso, customer_response_note: note })
        .eq("id", quoteId)
        .eq("status", "sent")
        .select("id");
      return !error && (data?.length ?? 0) === 1;
    },
    async setLeadStatus(leadId, to, note) {
      const { error } = await db().rpc("change_lead_status", { p_lead_id: leadId, p_to: to, p_note: note });
      if (error) throw new Error(error.message);
    },
    async addLeadNote(leadId, body) {
      const { error } = await db().from("lead_notes").insert({ lead_id: leadId, body: body.slice(0, 4000) });
      if (error) throw new Error(error.message);
    },
    async staffEmail(userId) {
      const { data } = await db().from("profiles").select("email, is_active").eq("id", userId).maybeSingle();
      return data?.is_active ? data.email : null;
    },
    notify: (data) => sendCustomerRespondedEmail(data),
    now: () => new Date(),
  };
}
