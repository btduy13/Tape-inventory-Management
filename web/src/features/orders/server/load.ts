// Page-level loaders: create the user-scoped (RLS) client and call the queries.
import "server-only";
import { parseListParams, type ListState, type RawParams } from "@/features/portal-ui";
import { seesAllLeads } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { leadListSpec, type LeadListSpec, type LeadRow } from "../lib/lead-list";
import { actorNamesViaService } from "./actor-names";
import { listAssigneeOptions, listLeadPage, type AssigneeOption } from "./lead-list";
import { loadLeadOverview, type LeadOverview } from "./overview";
import { getLeadDetail, type LeadDetail } from "./queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LeadListData = {
  spec: LeadListSpec;
  state: ListState;
  assignees: AssigneeOption[];
  rows: LeadRow[];
  total: number;
  capped: boolean;
  error: boolean;
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
  return { spec, state, assignees, ...page, error: page.error || assigneeError };
}

export async function loadOverview(): Promise<LeadOverview> {
  return loadLeadOverview(await createClient());
}

/** null => render notFound() (missing, invalid id, or hidden by RLS). */
export async function loadLeadDetail(leadId: string): Promise<LeadDetail | null> {
  if (!UUID_RE.test(leadId)) return null;
  return getLeadDetail(await createClient(), leadId, actorNamesViaService);
}
