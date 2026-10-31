"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { getDictionary } from "@/i18n";
import { fail, formToObject, ok, presetSchema, type AdminActionState } from "../lib/schemas";
import { adminOrNull } from "./guard";
import { savePreset } from "./presets";

const t = getDictionary();

export async function savePresetAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await adminOrNull())) return fail(t.common.errorForbidden);
  const parsed = presetSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);

  const result = await savePreset(await createClient(), parsed.data);
  if (!result.ok) {
    const message =
      result.reason === "duplicate"
        ? t.admin.presetDuplicate
        : result.reason === "forbidden"
          ? t.common.errorForbidden
          : result.reason === "invalid"
            ? t.common.errorValidation
            : t.common.errorGeneric;
    return fail(message);
  }
  revalidatePath(ROUTES.adminPresets);
  revalidatePath(ROUTES.design);
  return ok(t.admin.presetSaved);
}
