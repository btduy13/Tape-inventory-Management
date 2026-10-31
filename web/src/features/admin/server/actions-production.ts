"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { format, getDictionary } from "@/i18n";
import { fail, formToObject, leadIdSchema, ok, type AdminActionState } from "../lib/schemas";
import { adminOrNull } from "./guard";
import { convertLeadToProduction } from "./production";

const t = getDictionary();

export async function convertToProductionAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await adminOrNull())) return fail(t.common.errorForbidden);
  const parsed = leadIdSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);

  const result = await convertLeadToProduction(await createClient(), parsed.data.leadId);
  if (!result.ok) {
    const message = {
      forbidden: t.common.errorForbidden,
      notFound: t.admin.leadNotFound,
      notReady: t.admin.toProductionNotReady,
      generic: t.common.errorGeneric,
    }[result.reason];
    return fail(message);
  }
  revalidatePath(ROUTES.adminLead(parsed.data.leadId));
  revalidatePath(ROUTES.portalLead(parsed.data.leadId));
  revalidatePath(ROUTES.portal);
  return ok(format(t.admin.toProductionDone, { id: result.orderId }));
}
