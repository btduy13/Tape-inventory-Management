// Workshop fixtures: accepted leads (design + accepted quote, 8% VAT), production jobs assigned
// through the real RPC (service role = server code), preview objects. Suites clean up their own
// leads (jobs cascade) and the legacy orders the hand-off created.
import { createLead, createQuote, looseService, PNG_1PX } from "./lead-fixtures";

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`[workshop fixture] ${what}: ${res.error.message}`);
  return res.data as T;
}

/** Lead with design (logo path), accepted quote (10 x 1000 + 8% VAT), status accepted. */
export async function createAcceptedLead(tag: string): Promise<string> {
  const db = looseService();
  const leadId = await createLead({ tag });
  const { quoteId } = await createQuote(leadId, "sent");
  must(
    await db.from("quotes").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", quoteId).select("id"),
    "accept quote",
  );
  must(await db.from("leads").update({ status: "accepted" }).eq("id", leadId).select("id"), "accept lead");
  must(await db.from("designs").update({ preview_path: `${leadId}/preview.png` }).eq("lead_id", leadId).select("id"), "preview path");
  return leadId;
}

export async function assignJob(leadId: string, userId: string | null): Promise<string> {
  const row = must(
    await looseService().rpc("assign_production_job", { p_lead_id: leadId, p_user_id: userId }),
    "assign_production_job",
  ) as { id: string };
  return row.id;
}

export async function jobOf(leadId: string): Promise<{ id: string; order_id: string | null; step: string; workshop_user_id: string | null } | null> {
  const { data } = await looseService().from("production_jobs").select("id, order_id, step, workshop_user_id").eq("lead_id", leadId).maybeSingle();
  return data;
}

export async function leadStatus(leadId: string): Promise<string | null> {
  const { data } = await looseService().from("leads").select("status").eq("id", leadId).single();
  return (data as { status: string } | null)?.status ?? null;
}

export async function uploadPreview(leadId: string): Promise<void> {
  must(
    await looseService().storage.from("previews").upload(`${leadId}/preview.png`, PNG_1PX, { contentType: "image/png", upsert: true }),
    "upload preview",
  );
}

/** Vietnam calendar date + n days (YYYY-MM-DD). */
export function vnDate(days = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Removes the legacy orders created by hand-offs of these leads (before the leads go). */
export async function cleanupOrders(leadIds: string[]): Promise<void> {
  const db = looseService();
  const { data } = await db.from("production_jobs").select("order_id").in("lead_id", leadIds);
  const ids = (data ?? []).map((r: { order_id: string | null }) => r.order_id).filter(Boolean) as string[];
  if (ids.length) await db.from("bang_keo_in_orders").delete().in("id", ids);
}
