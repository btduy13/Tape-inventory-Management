// Read model for the portal. Always runs as the logged-in user: RLS limits staff/ctv
// to their assigned leads, so no role filtering happens here.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Design, Lead, LeadStatus, Quote } from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { actorIds, buildTimeline, type TimelineEntry } from "../lib/timeline";

type Db = SupabaseClient<Database>;

export const LEAD_LIST_LIMIT = 200;

export type LeadListItem = Pick<
  Lead,
  "id" | "code" | "customer_name" | "phone" | "company" | "quantity" | "status" | "assigned_to" | "created_at" | "updated_at"
> & { assigneeName: string | null };

export type QuoteSummary = Pick<Quote, "id" | "version" | "status" | "total" | "currency" | "sent_at" | "responded_at">;

export type LeadDetail = {
  lead: Lead;
  design: Design | null;
  previewUrl: string | null;
  timeline: TimelineEntry[];
  names: Record<string, string>;
  quotes: QuoteSummary[];
};

/** id -> display name for profiles the caller may read (staff only see themselves). */
export async function profileNames(db: Db, ids: readonly string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await db.from("profiles").select("id, full_name, email").in("id", [...ids]);
  const out: Record<string, string> = {};
  for (const p of data ?? []) out[p.id] = p.full_name || p.email || "";
  return out;
}

export async function listLeads(db: Db, status: LeadStatus | null = null): Promise<LeadListItem[]> {
  let q = db
    .from("leads")
    .select("id, code, customer_name, phone, company, quantity, status, assigned_to, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(LEAD_LIST_LIMIT);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(`listLeads failed: ${error.code ?? "unknown"}`);
  const rows = data ?? [];
  const names = await profileNames(db, [...new Set(rows.map((r) => r.assigned_to).filter((x): x is string => !!x))]);
  return rows.map((r) => ({ ...r, assigneeName: r.assigned_to ? names[r.assigned_to] ?? null : null }));
}

const PREVIEW_URL_TTL_SECONDS = 600;

export async function getLeadDetail(db: Db, leadId: string): Promise<LeadDetail | null> {
  const { data: lead } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return null; // not found OR not visible through RLS (e.g. unassigned)

  const [designs, log, notes, quotes] = await Promise.all([
    db.from("designs").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1),
    db.from("lead_status_log").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(200),
    db.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(200),
    db
      .from("quotes")
      .select("id, version, status, total, currency, sent_at, responded_at")
      .eq("lead_id", leadId)
      .order("version", { ascending: false }),
  ]);

  const design = designs.data?.[0] ?? null;
  const timeline = buildTimeline(log.data ?? [], notes.data ?? []);
  const ids = actorIds(timeline);
  if (lead.assigned_to) ids.push(lead.assigned_to);
  const names = await profileNames(db, [...new Set(ids)]);

  let previewUrl: string | null = null;
  if (design?.preview_path) {
    const { data } = await db.storage
      .from(STORAGE_BUCKETS.previews)
      .createSignedUrl(design.preview_path, PREVIEW_URL_TTL_SECONDS);
    previewUrl = data?.signedUrl ?? null;
  }

  return { lead, design, previewUrl, timeline, names, quotes: quotes.data ?? [] };
}
