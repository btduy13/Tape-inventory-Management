"use client";
import Link from "next/link";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { requestResetAction } from "../server/actions";
import { IDLE } from "../lib/action-state";
import { FormMessage, buttonClass, inputClass } from "./FormMessage";

const t = getDictionary();

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestResetAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">{t.auth.resetHint}</p>
      <label className="flex flex-col gap-1 text-sm">
        {t.auth.email}
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending || state.status === "success"} className={buttonClass}>
        {t.auth.resetSend}
      </button>
      <Link href={ROUTES.login} className="text-center text-sm text-amber-800 hover:underline">
        {t.auth.backToLogin}
      </Link>
    </form>
  );
}
