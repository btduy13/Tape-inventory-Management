"use client";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import { updatePasswordAction } from "../server/actions";
import { IDLE } from "../lib/action-state";
import { MIN_PASSWORD_LENGTH } from "../lib/schemas";
import { FormMessage, buttonClass, inputClass } from "./FormMessage";

const t = getDictionary();

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t.auth.newPassword}
        <input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t.auth.confirmPassword}
        <input name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className={inputClass} />
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {t.auth.updatePasswordButton}
      </button>
    </form>
  );
}
