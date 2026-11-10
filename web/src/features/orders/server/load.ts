// Page-level loaders: create the user-scoped (RLS) client and call the queries.
import "server-only";
import { parseListParams, type ListState, type RawParams } from "@/features/portal-ui";
import { seesAllLeads } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import type { LeadTabKey } from "../lib/lead-board";
import { leadListSpec, type LeadListSpec, type LeadRow } from "../lib/lead-list";
import { actorNamesViaService } from "./actor-names";
import { listAssigneeOptions, listLeadPage, type AssigneeOption } from "./lead-list";
import { getLeadDetail, type LeadDetail } from "./queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LeadListData = {
  spec: LeadListSpec;
  state: ListState;
  assignees: AssigneeOption[];
  rows: LeadRow[];
  total: number;
  /** Rows per status tab for the current search/filters; null on load error. */
  counts: Record<LeadTabKey, number> | null;
  capped: boolean;
  error: boolean;
  /** Render time (ms) for "Đã chờ" ages. */
  now: number;
};

/** Sorted / filtered / paged lead list from URL params. RLS decides which leads exist. */
export async function loadLeadListPage(profile: Profile, params: RawParams): Promise<LeadListData> {
  const db = await createClient();
  const { options: assignees, error: assigneeError } = seesAllLeads(profile)
    ? await listAssigneeOptions(db)
    : { options: [], error: false };
  const spec = leadListSpec(assignees.map((a) => a.id));
  const state = parseListParams(spec, params);
  const page = await listLeadPage(db, spec, state);
  return { spec, state, assignees, ...page, error: page.error || assigneeError, now: Date.now() };
}

/** null => render notFound() (missing, invalid id, or hidden by RLS). `now` = render time for the waiting age. */
export async function loadLeadDetail(leadId: string): Promise<(LeadDetail & { now: number }) | null> {
  if (!UUID_RE.test(leadId)) return null;
  const detail = await getLeadDetail(await createClient(), leadId, actorNamesViaService);
  return detail && { ...detail, now: Date.now() };
}
