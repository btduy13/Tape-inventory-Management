// Page-level loaders: create the user-scoped (RLS) client and call the queries.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseStatusFilter } from "../lib/schemas";
import { actorNamesViaService } from "./actor-names";
import { getLeadDetail, listLeads, type LeadDetail, type LeadListItem } from "./queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadLeadList(rawStatus: unknown): Promise<{ leads: LeadListItem[]; status: ReturnType<typeof parseStatusFilter> }> {
  const status = parseStatusFilter(rawStatus);
  return { leads: await listLeads(await createClient(), status), status };
}

/** null => render notFound() (missing, invalid id, or hidden by RLS). */
export async function loadLeadDetail(leadId: string): Promise<LeadDetail | null> {
  if (!UUID_RE.test(leadId)) return null;
  return getLeadDetail(await createClient(), leadId, actorNamesViaService);
}
