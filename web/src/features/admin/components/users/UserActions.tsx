"use client";
// Per-row role change + lock / unlock, each behind a confirmation. updateUserAction re-checks
// admin, zod and self-lockout; SQL (profiles_guard_columns) blocks it again.
import { useActionState, useState } from "react";
import { format, getDictionary } from "@/i18n";
import { ROLES, type AppRole } from "@/lib/types";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { updateUserAction } from "../../server/actions-users";
import { IDLE } from "../../lib/schemas";
import { ROLE_SUMMARY_KEY } from "../../lib/permissions";
import type { UserRow } from "../../server/queries";
import { nextToast, useOnSuccess } from "../useOnSuccess";

const t = getDictionary();
const a = t.adminUi;

export function UserActions({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [roleState, saveRole, savingRole] = useActionState(updateUserAction, IDLE);
  const [lockState, saveLock, savingLock] = useActionState(updateUserAction, IDLE);
  const [role, setRole] = useState<AppRole>(user.role);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const show = (message?: string) => message && setToast(nextToast(message));
  useOnSuccess(roleState, show);
  useOnSuccess(lockState, show);
  const name = user.full_name || user.email || "";

  if (isSelf) return <p className="max-w-56 text-xs text-pt-muted">{a.isSelf}</p>;

  const busy = savingRole || savingLock;
  const error = [roleState, lockState].find((s) => s.status === "error");
  return (
    // Fixed-width 2-column grid: the table cell cannot squeeze it, so the select shows full role
    // names ("Cộng tác viên") at 768-1024px; the role form uses `contents` to place its button
    // beside the lock button on the second row.
    <div className="pt-row-raise grid w-60 grid-cols-2 gap-2" data-testid="user-actions">
      <form action={saveRole} className="contents">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="isActive" value={String(user.is_active)} />
        <select name="role" value={role} onChange={(e) => setRole(e.target.value as AppRole)} aria-label={`${a.colRole}: ${name}`} className={`${inputClass} col-span-2`}>
          {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
        </select>
        <ConfirmSubmit
          label={a.changeRole}
          title={format(a.changeRoleTitle, { name })}
          body={format(a.changeRoleBody, { from: t.roles[user.role], to: t.roles[role], summary: a[ROLE_SUMMARY_KEY[role]] })}
          disabled={busy || role === user.role}
          className={buttonClass("secondary", "sm", "w-full whitespace-nowrap")}
        />
      </form>
      <form action={saveLock} className="flex">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="role" value={user.role} />
        <input type="hidden" name="isActive" value={String(!user.is_active)} />
        {user.is_active ? (
          <ConfirmSubmit label={a.lock} tone="danger" title={format(a.lockTitle, { name })} body={a.lockBody} disabled={busy} className={buttonClass("secondary", "sm", "w-full whitespace-nowrap border-pt-red-ink/40 text-pt-red-ink!")} />
        ) : (
          <ConfirmSubmit label={a.unlock} title={format(a.unlockTitle, { name })} body={format(a.unlockBody, { role: t.roles[user.role] })} disabled={busy} className={buttonClass("secondary", "sm", "w-full whitespace-nowrap")} />
        )}
      </form>
      {error?.message && <div className="col-span-2"><InlineStatus tone="error">{error.message}</InlineStatus></div>}
      <Toast toast={toast} />
    </div>
  );
}
