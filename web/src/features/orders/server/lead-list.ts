// Lead list query. Runs as the logged-in user: RLS limits staff/ctv to their assigned leads,
// so no role filtering happens here. Narrow filters (assignee, created date) go to the database;
// status also goes to the database for the listed rows; search, source, sort and paging run in memory
// over at most LEAD_SCAN_LIMIT rows. Tab counts come from a second, any-status scan.
// shortcut: tab counts and search only see the newest 1000 leads; upgrade to a count RPC if the table grows.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyListInMemory, applyListQuery, defineListSpec, type ListState } from "@/features/portal-ui";
import type { Database } from "@/lib/types";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { countLeadTabs, type LeadTabKey } from "../lib/lead-board";
import { LEAD_SCAN_LIMIT, UNASSIGNED, toLeadRow, type LeadListSpec, type LeadRow, type RawLeadRow } from "../lib/lead-list";
import { profileNames } from "./queries";

type Db = SupabaseClient<Database>;

const LIST_COLUMNS =
  "id, code, customer_name, phone, company, quantity, status, assigned_to, created_at, updated_at, designs(preset_id), quotes(total, version)";

/** Database pre-filter: created_at day range (VN time). */
const DB_SPEC = defineListSpec({
  sort: { keys: { updated: { column: "updated_at", firstDir: "desc" } }, default: { key: "updated", dir: "desc" } },
  dateRange: { column: "created_at" },
});

export type LeadPage = { rows: LeadRow[]; total: number; counts: Record<LeadTabKey, number> | null; capped: boolean; error: boolean };

export async function listLeadPage(db: Db, spec: LeadListSpec, state: ListState): Promise<LeadPage> {
  const statuses = state.filters.status ?? [];
  const scan = (status: readonly string[]) => {
    let q = applyListQuery(
      db.from("leads").select(LIST_COLUMNS),
      DB_SPEC,
      { ...state, q: "", sort: "updated", dir: "desc", filters: {} },
      { paginate: false },
    );
    const assignee = state.filters.assignee?.[0];
    if (assignee === UNASSIGNED) q = q.is("assigned_to", null);
    else if (assignee) q = q.eq("assigned_to", assignee);
    if (status.length > 0) q = q.in("status", status as RawLeadRow["status"][]);
    return q.limit(LEAD_SCAN_LIMIT + 1);
  };
  // The listed rows filter status in the database (an old open lead is never cut off by the scan cap);
  // the tab counts come from one any-status scan.
  const [all, only] = await Promise.all([scan([]), statuses.length > 0 ? scan(statuses) : null]);
  if (all.error || only?.error) return { rows: [], total: 0, counts: null, capped: false, error: true };
  const cut = (data: unknown) => {
    const raw = (data ?? []) as unknown as RawLeadRow[];
    return { capped: raw.length > LEAD_SCAN_LIMIT, rows: raw.slice(0, LEAD_SCAN_LIMIT) };
  };
  const anyScan = cut(all.data);
  const listScan = only ? cut(only.data) : anyScan;
  const ids = [...anyScan.rows, ...listScan.rows].map((r) => r.assigned_to).filter((x): x is string => !!x);
  const names = await profileNames(db, [...new Set(ids)]);
  const anyStatus = { ...state, filters: { ...state.filters, status: [] } };
  const { rows: matched } = applyListInMemory(anyScan.rows.map((r) => toLeadRow(r, names)), spec, anyStatus, { paginate: false });
  const { rows, total } = applyListInMemory(listScan.rows.map((r) => toLeadRow(r, names)), spec, state);
  return { rows, total, counts: countLeadTabs(matched), capped: listScan.capped, error: false };
}

export type AssigneeOption = { id: string; name: string };

/** Internal users for the assignee filter (admin/manager: profiles RLS lets them read these).
 *  error=true when the profiles read failed, so the page can show its error state instead of
 *  silently dropping every assignee id from the filter. */
export async function listAssigneeOptions(db: Db): Promise<{ options: AssigneeOption[]; error: boolean }> {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, email")
    .in("role", [...ROLE_GROUPS.internal])
    .order("full_name", { ascending: true });
  if (error) return { options: [], error: true };
  return { options: (data ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email || p.id })), error: false };
}
