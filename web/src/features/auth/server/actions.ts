"use server";
// Auth Server Actions (Next.js verifies Origin for Server Actions; inputs validated with zod).
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { ROUTES } from "@/lib/routes";
import { homeFor } from "@/features/portal-ui/lib/nav";
import { safeNextPath } from "@/lib/security/safe-redirect";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getDictionary } from "@/i18n";
import { formToObject, loginSchema, resetRequestSchema, updatePasswordSchema } from "../lib/schemas";
import { fail, ok, type AuthActionState } from "../lib/action-state";
import { UPDATE_PASSWORD_PATH } from "../lib/callback";
import { performLogin, requestPasswordReset, updatePassword } from "./login";
import { AUTH_RATE_LIMITS } from "./rate-limits";

const t = getDictionary();

export async function loginAction(_prev: AuthActionState, form: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.auth.invalidCredentials);

  if (!(await checkRateLimit(await headers(), AUTH_RATE_LIMITS.login))) {
    return fail(t.common.errorRateLimited);
  }

  const db = await createClient();
  const result = await performLogin(db, parsed.data.email, parsed.data.password);
  if (result === "invalid") return fail(t.auth.invalidCredentials);
  if (result === "disabled") return fail(t.auth.accountDisabled);
  if (result === "error") return fail(t.common.errorGeneric);

  // No ?next=: land on the role's home (admin: overview, workshop: job board).
  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = user ? await db.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  // redirect() throws NEXT_REDIRECT: keep it outside try/catch.
  redirect(safeNextPath(parsed.data.next, profile ? homeFor(profile.role) : ROUTES.portal));
}

export async function logoutAction(): Promise<void> {
  const db = await createClient();
  await db.auth.signOut();
  redirect(ROUTES.login);
}

export async function requestResetAction(_prev: AuthActionState, form: FormData): Promise<AuthActionState> {
  const parsed = resetRequestSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.auth.invalidEmail);

  if (!(await checkRateLimit(await headers(), AUTH_RATE_LIMITS.passwordReset))) {
    return fail(t.common.errorRateLimited);
  }

  const callback = new URL(ROUTES.authCallback, publicEnv().NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", UPDATE_PASSWORD_PATH);
  await requestPasswordReset(await createClient(), parsed.data.email, callback.toString());
  return ok(t.auth.resetSent);
}

export async function updatePasswordAction(_prev: AuthActionState, form: FormData): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.message;
    return fail(key === "passwordMismatch" ? t.auth.passwordMismatch : t.auth.passwordTooShort);
  }
  const result = await updatePassword(await createClient(), parsed.data.password);
  if (result === "no-session") return fail(t.auth.linkInvalid);
  if (result === "weak") return fail(t.auth.passwordTooShort);
  if (result === "error") return fail(t.common.errorGeneric);
  redirect(ROUTES.portal);
}
