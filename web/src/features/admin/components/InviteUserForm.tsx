"use client";
import { useActionState, useEffect, useRef } from "react";
import { getDictionary } from "@/i18n";
import { ROLES } from "@/lib/types";
import { inviteUserAction } from "../server/actions-users";
import { IDLE } from "../lib/schemas";
import { ActionMessage, field, primaryButton } from "./ui";

const t = getDictionary();

export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteUserAction, IDLE);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <h2 className="font-semibold">{t.admin.inviteUser}</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          {t.admin.email}
          <input name="email" type="email" required maxLength={254} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.admin.fullName}
          <input name="fullName" required maxLength={120} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.admin.role}
          <select name="role" defaultValue="staff" className={field}>
            {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending} className={primaryButton}>{t.admin.sendInvite}</button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
