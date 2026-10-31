"use client";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import { ROLES } from "@/lib/types";
import { updateUserAction } from "../server/actions-users";
import { IDLE } from "../lib/schemas";
import type { UserRow } from "../server/queries";
import { ActionMessage, field, secondaryButton } from "./ui";

const t = getDictionary();

/** One editable row. Self row is read-only (server + SQL also block self-lockout). */
export function UserRowForm({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [state, action, pending] = useActionState(updateUserAction, IDLE);
  return (
    <li className="flex flex-col gap-2 border-t border-neutral-100 py-3 first:border-t-0">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="userId" value={user.id} />
        <div className="min-w-48 flex-1">
          <div className="font-medium">{user.full_name || "—"}</div>
          <div className="text-xs text-neutral-500">{user.email}</div>
        </div>
        <select name="role" defaultValue={user.role} disabled={isSelf} aria-label={t.admin.role} className={field}>
          {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={user.is_active} disabled={isSelf} />
          {t.admin.active}
        </label>
        {!isSelf && (
          <button type="submit" disabled={pending} className={secondaryButton}>{t.common.save}</button>
        )}
      </form>
      <ActionMessage state={state} />
    </li>
  );
}
