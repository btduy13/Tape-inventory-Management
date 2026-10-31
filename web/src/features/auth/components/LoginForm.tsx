"use client";
import Link from "next/link";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import { loginAction } from "../server/actions";
import { IDLE } from "../lib/action-state";
import { RESET_REQUEST_PATH } from "../lib/callback";
import { FormMessage, buttonClass, inputClass } from "./FormMessage";

const t = getDictionary();

/** `next` is validated again on the server with safeNextPath(). */
export function LoginForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, linkError ? { status: "error", message: t.auth.linkInvalid } : IDLE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1 text-sm">
        {t.auth.email}
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t.auth.password}
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? t.auth.signingIn : t.auth.loginButton}
      </button>
      <Link href={RESET_REQUEST_PATH} className="text-center text-sm text-amber-800 hover:underline">
        {t.auth.forgotPassword}
      </Link>
    </form>
  );
}
