"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { format, getDictionary } from "@/i18n";
import { sendStaffAssignedEmail } from "@/features/email";
import { assignSchema, formToObject, type AssignActionState } from "../lib/schemas";
import { assignLead } from "./assign";

const t = getDictionary();

const REASON_MESSAGE = {
  forbidden: t.common.errorForbidden,
  notFound: t.assignment.leadNotFound,
  invalidAssignee: t.assignment.invalidAssignee,
  generic: t.common.errorGeneric,
} as const;

/** One action for both assign (userId set) and unassign (userId empty). Admin only. */
export async function assignLeadAction(_prev: AssignActionState, form: FormData): Promise<AssignActionState> {
  try {
    await assertRole(ROLE_GROUPS.admin);
  } catch (e) {
    if (e instanceof ForbiddenError) return { status: "error", message: t.common.errorForbidden };
    throw e;
  }
  const parsed = assignSchema.safeParse(formToObject(form));
  if (!parsed.success) return { status: "error", message: t.common.errorValidation };

  const result = await assignLead(await createClient(), (n) => sendStaffAssignedEmail(n), parsed.data);
  if (!result.ok) return { status: "error", message: REASON_MESSAGE[result.reason] };

  revalidatePath(ROUTES.portal);
  revalidatePath(ROUTES.portalLead(parsed.data.leadId));
  revalidatePath(ROUTES.adminLead(parsed.data.leadId));

  if (!parsed.data.userId) return { status: "success", message: t.assignment.unassignedDone };
  const message = format(t.assignment.assignedTo, { name: result.assigneeName ?? "" });
  return result.notified
    ? { status: "success", message }
    : { status: "warning", message: `${message} ${t.assignment.notifyFailed}` };
}
