// Server component: loads assignees (admin-visible profiles) and renders the form.
// Renders nothing for non-admins, so pages can include it unconditionally.
import { canAssign } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { listAssignees } from "../server/queries";
import { AssignForm } from "./AssignForm";

export async function AssignPanel({ profile, leadId, code, currentAssigneeId }: { profile: Profile; leadId: string; code: string; currentAssigneeId: string | null }) {
  if (!canAssign(profile)) return null;
  const assignees = await listAssignees(await createClient());
  return <AssignForm leadId={leadId} code={code} currentAssigneeId={currentAssigneeId} assignees={assignees} />;
}
