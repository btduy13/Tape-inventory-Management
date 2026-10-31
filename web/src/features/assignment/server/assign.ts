// Assign / unassign core logic (framework-free, unit-tested with mocks).
// Runs as the logged-in admin: assign_lead re-checks is_admin() in SQL.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { AssignInput } from "../lib/schemas";

type Db = SupabaseClient<Database>;

/** Email port (features/email sendStaffAssignedEmail satisfies it). */
export type StaffAssignedNotice = {
  leadId: string;
  code: string;
  customerName: string;
  phone: string | null;
  quantity: number | null;
  staffEmail: string | null;
  staffName: string;
};
export type NotifyStaffAssigned = (notice: StaffAssignedNotice) => Promise<{ ok: boolean }>;

export type AssignResult =
  | { ok: true; assigneeName: string | null; notified: boolean | null }
  | { ok: false; reason: "forbidden" | "notFound" | "invalidAssignee" | "generic" };

function reasonFor(code: string | undefined): Exclude<AssignResult, { ok: true }>["reason"] {
  if (code === "42501") return "forbidden";
  if (code === "P0002") return "notFound";
  if (code === "22023") return "invalidAssignee";
  return "generic";
}

export async function assignLead(db: Db, notify: NotifyStaffAssigned, input: AssignInput): Promise<AssignResult> {
  const { data: lead, error } = await db.rpc("assign_lead", { p_lead_id: input.leadId, p_user_id: input.userId });
  if (error || !lead) return { ok: false, reason: reasonFor(error?.code) };
  if (!input.userId) return { ok: true, assigneeName: null, notified: null };

  const { data: assignee } = await db
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", input.userId)
    .maybeSingle();
  const assigneeName = assignee?.full_name || assignee?.email || null;

  // Assignment already succeeded: a failed email must not undo it, only be reported.
  let notified = false;
  try {
    const res = await notify({
      leadId: lead.id,
      code: lead.code,
      customerName: lead.customer_name,
      phone: lead.phone,
      quantity: lead.quantity,
      staffEmail: assignee?.email ?? null,
      staffName: assigneeName ?? "",
    });
    notified = res.ok;
  } catch {
    notified = false;
  }
  return { ok: true, assigneeName, notified };
}
