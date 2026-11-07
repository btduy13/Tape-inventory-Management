// Read model for the portal. Always runs as the logged-in user: RLS limits staff/ctv
// to their assigned leads, so no role filtering happens here.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Design, Lead, Quote } from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { actorIds, buildTimeline, type TimelineEntry } from "../lib/timeline";
import type { NameResolver } from "./actor-names";

type Db = SupabaseClient<Database>;

export type QuoteSummary = Pick<Quote, "id" | "version" | "status" | "total" | "vat_percent" | "currency" | "sent_at" | "responded_at">;

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

const PREVIEW_URL_TTL_SECONDS = 600;

/**
 * `resolveHiddenNames` fills in actors whose profile RLS hides from the caller; it is only
 * given ids from timeline rows the caller could already read.
 */
export async function getLeadDetail(
  db: Db,
  leadId: string,
  resolveHiddenNames?: NameResolver,
): Promise<LeadDetail | null> {
  const { data: lead } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return null; // not found OR not visible through RLS (e.g. unassigned)

  const [designs, log, notes, quotes] = await Promise.all([
    db.from("designs").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1),
    db.from("lead_status_log").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(200),
    db.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(200),
    db
      .from("quotes")
      .select("id, version, status, total, vat_percent, currency, sent_at, responded_at")
      .eq("lead_id", leadId)
      .order("version", { ascending: false }),
  ]);

  const design = designs.data?.[0] ?? null;
  const timeline = buildTimeline(log.data ?? [], notes.data ?? []);
  const ids = actorIds(timeline);
  if (lead.assigned_to) ids.push(lead.assigned_to);
  const unique = [...new Set(ids)];
  const names = await profileNames(db, unique);
  const hidden = unique.filter((id) => !names[id]);
  if (hidden.length > 0 && resolveHiddenNames) Object.assign(names, await resolveHiddenNames(hidden));

  let previewUrl: string | null = null;
  if (design?.preview_path) {
    const { data } = await db.storage
      .from(STORAGE_BUCKETS.previews)
      .createSignedUrl(design.preview_path, PREVIEW_URL_TTL_SECONDS);
    previewUrl = data?.signedUrl ?? null;
  }

  return { lead, design, previewUrl, timeline, names, quotes: quotes.data ?? [] };
}
