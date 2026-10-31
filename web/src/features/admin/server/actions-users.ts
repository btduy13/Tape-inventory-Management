"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { ROUTES } from "@/lib/routes";
import { format, getDictionary } from "@/i18n";
import { UPDATE_PASSWORD_PATH } from "@/features/auth";
import { fail, formToObject, inviteSchema, isSelfLockout, ok, updateUserSchema, type AdminActionState } from "../lib/schemas";
import { adminOrNull } from "./guard";
import { inviteUser, updateUser } from "./users";

const t = getDictionary();

export async function inviteUserAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await adminOrNull())) return fail(t.common.errorForbidden);
  const parsed = inviteSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);

  const redirectTo = new URL(ROUTES.authCallback, publicEnv().NEXT_PUBLIC_SITE_URL);
  redirectTo.searchParams.set("next", UPDATE_PASSWORD_PATH);
  const result = await inviteUser(createAdminClient(), parsed.data, redirectTo.toString());
  if (!result.ok) return fail(result.reason === "exists" ? t.admin.emailExists : t.common.errorGeneric);

  revalidatePath(ROUTES.adminUsers);
  return ok(format(t.admin.invited, { email: parsed.data.email }));
}

export async function updateUserAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  const actor = await adminOrNull();
  if (!actor) return fail(t.common.errorForbidden);
  const parsed = updateUserSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);
  if (isSelfLockout(actor, parsed.data)) return fail(t.admin.cannotChangeSelf);

  const result = await updateUser(await createClient(), createAdminClient(), parsed.data);
  if (!result.ok) {
    return fail(result.reason === "forbidden" ? t.common.errorForbidden : t.common.errorGeneric);
  }
  revalidatePath(ROUTES.adminUsers);
  return result.authSynced ? ok(t.admin.userUpdated) : ok(`${t.admin.userUpdated} ${t.admin.authSyncFailed}`);
}
