// /admin overview numbers + "Cần xử lý" queues. Admin RLS client; head-only count queries.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import { OPEN_STATUSES } from "../lib/lead-list";

type Db = SupabaseClient<Database>;

export const QUEUE_SIZE = 5;

export type QueueLead = {
  id: string;
  code: string;
  customer_name: string;
  company: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

export type LeadOverview = {
  counts: Record<LeadStatus, number>;
  unassigned: number;
  overdueJobs: number;
  queues: { unassigned: QueueLead[]; consulting: QueueLead[]; accepted: QueueLead[] };
  error: boolean;
};

const QUEUE_COLUMNS = "id, code, customer_name, company, status, created_at, updated_at";

/** Today in Vietnam (YYYY-MM-DD). */
export function vnToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export async function loadLeadOverview(db: Db): Promise<LeadOverview> {
  const count = (status: LeadStatus) => db.from("leads").select("id", { count: "exact", head: true }).eq("status", status);
  const [statusCounts, unassigned, overdue, qNew, qConsulting, qAccepted] = await Promise.all([
    Promise.all(LEAD_STATUSES.map(count)),
    db.from("leads").select("id", { count: "exact", head: true }).is("assigned_to", null).in("status", [...OPEN_STATUSES]),
    db
      .from("production_jobs")
      .select("id", { count: "exact", head: true })
      .lt("due_date", vnToday())
      .not("step", "in", "(da_giao,huy)"),
    db.from("leads").select(QUEUE_COLUMNS).eq("status", "new").is("assigned_to", null).order("created_at", { ascending: true }).limit(QUEUE_SIZE),
    db.from("leads").select(QUEUE_COLUMNS).eq("status", "consulting").order("updated_at", { ascending: true }).limit(QUEUE_SIZE),
    db.from("leads").select(QUEUE_COLUMNS).eq("status", "accepted").order("updated_at", { ascending: true }).limit(QUEUE_SIZE),
  ]);

  const counts = Object.fromEntries(LEAD_STATUSES.map((s, i) => [s, statusCounts[i]?.count ?? 0])) as Record<LeadStatus, number>;
  const error = [...statusCounts, unassigned, overdue, qNew, qConsulting, qAccepted].some((r) => !!r.error);
  return {
    counts,
    unassigned: unassigned.count ?? 0,
    overdueJobs: overdue.count ?? 0,
    queues: { unassigned: qNew.data ?? [], consulting: qConsulting.data ?? [], accepted: qAccepted.data ?? [] },
    error,
  };
}
