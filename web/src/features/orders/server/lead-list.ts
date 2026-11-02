// Lead list query. Runs as the logged-in user: RLS limits staff/ctv to their assigned leads,
// so no role filtering happens here. Narrow filters (status, assignee, created date) go to the
// database; search, source, sort and paging run in memory over at most LEAD_SCAN_LIMIT rows.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyListInMemory, applyListQuery, defineListSpec, type ListState } from "@/features/portal-ui";
import type { Database } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { LEAD_SCAN_LIMIT, UNASSIGNED, toLeadRow, type LeadListSpec, type LeadRow, type RawLeadRow } from "../lib/lead-list";
import { profileNames } from "./queries";

type Db = SupabaseClient<Database>;

const LIST_COLUMNS =
  "id, code, customer_name, phone, company, quantity, status, assigned_to, created_at, updated_at, designs(preset_id), quotes(total, version)";

/** Database pre-filter: whitelisted status values + created_at day range (VN time). */
const DB_SPEC = defineListSpec({
  sort: { keys: { updated: { column: "updated_at", firstDir: "desc" } }, default: { key: "updated", dir: "desc" } },
  filters: { status: { kind: "enum", column: "status", values: LEAD_STATUSES, multi: true } },
  dateRange: { column: "created_at" },
});

export type LeadPage = { rows: LeadRow[]; total: number; capped: boolean; error: boolean };

export async function listLeadPage(db: Db, spec: LeadListSpec, state: ListState): Promise<LeadPage> {
  let q = applyListQuery(
    db.from("leads").select(LIST_COLUMNS),
    DB_SPEC,
    { ...state, q: "", sort: "updated", dir: "desc", filters: { status: state.filters.status ?? [] } },
    { paginate: false },
  );
  const assignee = state.filters.assignee?.[0];
  if (assignee === UNASSIGNED) q = q.is("assigned_to", null);
  else if (assignee) q = q.eq("assigned_to", assignee);

  const { data, error } = await q.limit(LEAD_SCAN_LIMIT + 1);
  if (error) return { rows: [], total: 0, capped: false, error: true };
  const raw = (data ?? []) as unknown as RawLeadRow[];
  const capped = raw.length > LEAD_SCAN_LIMIT;
  const scanned = capped ? raw.slice(0, LEAD_SCAN_LIMIT) : raw;
  const names = await profileNames(db, [...new Set(scanned.map((r) => r.assigned_to).filter((x): x is string => !!x))]);
  const { rows, total } = applyListInMemory(scanned.map((r) => toLeadRow(r, names)), spec, state);
  return { rows, total, capped, error: false };
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
