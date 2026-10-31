// Supabase / Resend wiring for sendQuote(). Caller MUST have passed assertRole(pricing).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendQuoteEmail } from "@/features/email";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS, type Database } from "@/lib/types";
import { quotePdfFilename, renderQuotePdf } from "./pdf/render";
import { getLeadInfo, getQuoteWithLines } from "./queries";
import type { SendDeps } from "./send-quote";

/** `db` is the user-scoped client (RLS); service role only for storage + tokens. */
export function createSendDeps(db: SupabaseClient<Database>): SendDeps {
  const admin = () => createAdminClient();
  return {
    async loadContext(quoteId) {
      const quote = await getQuoteWithLines(quoteId, db);
      if (!quote) return null;
      const lead = await getLeadInfo(quote.lead_id, db);
      return lead ? { quote, lead } : null;
    },
    renderPdf: renderQuotePdf,
    async uploadPdf(path, bytes) {
      const { error } = await admin()
        .storage.from(STORAGE_BUCKETS.quotes)
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (error) throw new Error(error.message);
    },
    async insertToken(quoteId, tokenHash, expiresAt) {
      const { data, error } = await admin()
        .from("quote_tokens")
        .insert({ quote_id: quoteId, token_hash: tokenHash, expires_at: expiresAt })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "token insert failed");
      return data.id;
    },
    async revokeTokens(quoteId, { exceptId, onlyId }) {
      let q = admin()
        .from("quote_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("quote_id", quoteId)
        .is("revoked_at", null);
      if (onlyId) q = q.eq("id", onlyId);
      if (exceptId) q = q.neq("id", exceptId);
      const { error } = await q;
      if (error) throw new Error(error.message);
    },
    sendEmail: ({ ctx, token, expiresAt, pdf }) =>
      sendQuoteEmail({
        code: ctx.lead.code,
        customerName: ctx.lead.customer_name,
        customerEmail: ctx.lead.email ?? "",
        total: ctx.quote.total,
        validUntil: ctx.quote.valid_until,
        token,
        linkExpiresAt: expiresAt,
        pdf: { filename: quotePdfFilename(ctx.lead.code, ctx.quote.version), content: pdf },
      }),
    async markSent(quoteId, pdfPath, sentAt) {
      const { error } = await db
        .from("quotes")
        .update({ status: "sent", sent_at: sentAt, pdf_path: pdfPath })
        .eq("id", quoteId);
      if (error) throw new Error(error.message);
    },
    async supersedeOtherQuotes(leadId, keepQuoteId) {
      // As the user (RLS + quotes_guard); cancelled quotes fail evaluateTokenAccess anyway.
      const { data, error } = await db
        .from("quotes")
        .update({ status: "cancelled" })
        .eq("lead_id", leadId)
        .eq("status", "sent")
        .neq("id", keepQuoteId)
        .select("id");
      if (error) throw new Error(error.message);
      const ids = (data ?? []).map((r) => r.id);
      if (ids.length === 0) return;
      const { error: revokeError } = await admin()
        .from("quote_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .in("quote_id", ids)
        .is("revoked_at", null);
      if (revokeError) throw new Error(revokeError.message);
    },
    async setLeadStatus(leadId, to, note) {
      const { error } = await db.rpc("change_lead_status", { p_lead_id: leadId, p_to: to, p_note: note });
      if (error) throw new Error(error.message);
    },
    ttlDays: serverEnv().QUOTE_TOKEN_TTL_DAYS,
    now: () => new Date(),
  };
}
