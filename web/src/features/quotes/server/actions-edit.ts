"use server";
// Quote editor actions (admin/manager). RLS + guard triggers enforce the same rules in SQL.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/types";
import { vi } from "@/i18n/vi";
import { canCreateNewVersion, isEditable } from "../lib/rules";
import { saveDraftSchema, uuidSchema, type SaveDraftInput } from "../lib/schemas";
import type { ActionResult, QuoteWithLines } from "../lib/types";
import { check, checkOne, fail, guarded, INTERNAL, PRICING, revalidateLead } from "./action-utils";
import { getQuoteWithLines } from "./queries";

const DEFAULT_VAT_PERCENT = 10;

async function nextVersion(db: Awaited<ReturnType<typeof createClient>>, leadId: string): Promise<number> {
  const rows = check(
    await db.from("quotes").select("version").eq("lead_id", leadId).order("version", { ascending: false }).limit(1),
  );
  return (rows?.[0]?.version ?? 0) + 1;
}

/** New draft with one pre-filled line (size + quantity from the request, price left at 0). */
export async function createDraftQuoteAction(leadId: string): Promise<ActionResult<QuoteWithLines>> {
  return guarded(PRICING, async () => {
    const id = uuidSchema.safeParse(leadId);
    if (!id.success) return fail(vi.common.errorValidation);
    const db = await createClient();
    const lead = check(await db.from("leads").select("id, quantity").eq("id", id.data).maybeSingle());
    if (!lead) return fail(vi.common.errorForbidden);
    const design = check(
      await db.from("designs").select("width_mm, length_m").eq("lead_id", lead.id).limit(1).maybeSingle(),
    );
    const quote = checkOne(
      await db
        .from("quotes")
        .insert({ lead_id: lead.id, version: await nextVersion(db, lead.id), vat_percent: DEFAULT_VAT_PERCENT })
        .select("id")
        .single(),
    );
    const size = design ? ` ${Number(design.width_mm)}mm x ${Number(design.length_m)}m` : "";
    check(
      await db.from("quote_lines").insert({
        quote_id: quote.id,
        sort_order: 0,
        description: `Băng keo in logo${size}`,
        quantity: Math.max(1, lead.quantity),
        unit_price: 0,
      }),
    );
    revalidateLead(lead.id);
    const full = await getQuoteWithLines(quote.id, db);
    return full ? { ok: true, data: full } : fail(vi.common.errorGeneric);
  });
}

/** Replace header fields + all lines of a draft. Totals come back recomputed by the DB. */
export async function saveQuoteDraftAction(input: SaveDraftInput): Promise<ActionResult<QuoteWithLines>> {
  return guarded(PRICING, async () => {
    const parsed = saveDraftSchema.safeParse(input);
    if (!parsed.success) return fail(vi.common.errorValidation);
    const { quoteId, vatPercent, validUntil, notes, lines } = parsed.data;
    const db = await createClient();
    const current = await getQuoteWithLines(quoteId, db);
    if (!current) return fail(vi.common.errorForbidden);
    if (!isEditable(current.status)) return fail(vi.quotes.errLocked);

    check(
      await db.from("quotes").update({ vat_percent: vatPercent, valid_until: validUntil, notes }).eq("id", quoteId),
    );
    // Insert new lines first, then delete the old ones: a failure never leaves the quote empty.
    check(
      await db.from("quote_lines").insert(
        lines.map((l, i) => ({
          quote_id: quoteId,
          sort_order: i,
          description: l.description,
          unit: l.unit,
          quantity: l.quantity,
          unit_price: l.unitPrice,
        })),
      ),
    );
    const oldIds = current.lines.map((l) => l.id);
    if (oldIds.length > 0) check(await db.from("quote_lines").delete().in("id", oldIds));

    revalidateLead(current.lead_id);
    const saved = await getQuoteWithLines(quoteId, db);
    return saved ? { ok: true, data: saved } : fail(vi.common.errorGeneric);
  });
}

/** Copy a sent/answered quote into version + 1 (draft). A still-open sent quote is cancelled. */
export async function createQuoteVersionAction(quoteId: string): Promise<ActionResult<QuoteWithLines>> {
  return guarded(PRICING, async () => {
    const id = uuidSchema.safeParse(quoteId);
    if (!id.success) return fail(vi.common.errorValidation);
    const db = await createClient();
    const src = await getQuoteWithLines(id.data, db);
    if (!src) return fail(vi.common.errorForbidden);
    if (!canCreateNewVersion(src.status)) return fail(vi.quotes.errNotSendable);

    const copy = checkOne(
      await db
        .from("quotes")
        .insert({
          lead_id: src.lead_id,
          version: await nextVersion(db, src.lead_id),
          vat_percent: src.vat_percent,
          currency: src.currency,
          notes: src.notes,
        })
        .select("id")
        .single(),
    );
    if (src.lines.length > 0) {
      check(
        await db.from("quote_lines").insert(
          src.lines.map((l) => ({
            quote_id: copy.id,
            sort_order: l.sort_order,
            description: l.description,
            unit: l.unit,
            quantity: l.quantity,
            unit_price: l.unit_price,
          })),
        ),
      );
    }
    if (src.status === "sent") {
      check(await db.from("quotes").update({ status: "cancelled" }).eq("id", src.id));
      // Old customer links must stop working (tokens are service-role only).
      check(
        await createAdminClient()
          .from("quote_tokens")
          .update({ revoked_at: new Date().toISOString() })
          .eq("quote_id", src.id)
          .is("revoked_at", null),
      );
    }
    revalidateLead(src.lead_id);
    const full = await getQuoteWithLines(copy.id, db);
    return full ? { ok: true, data: full } : fail(vi.common.errorGeneric);
  });
}

/** Short-lived signed URL for the stored PDF (any internal user who can see the lead). */
export async function getQuotePdfUrlAction(quoteId: string): Promise<ActionResult<string>> {
  return guarded(INTERNAL, async () => {
    const id = uuidSchema.safeParse(quoteId);
    if (!id.success) return fail(vi.common.errorValidation);
    const db = await createClient();
    const row = check(await db.from("quotes").select("pdf_path").eq("id", id.data).maybeSingle());
    if (!row?.pdf_path) return fail(vi.common.errorForbidden);
    const { data, error } = await db.storage.from(STORAGE_BUCKETS.quotes).createSignedUrl(row.pdf_path, 300);
    if (error || !data) return fail(vi.common.errorForbidden);
    return { ok: true, data: data.signedUrl };
  });
}
