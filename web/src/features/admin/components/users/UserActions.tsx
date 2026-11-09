"use client";
// Per-row "Sửa" (edit dialog: name, phone, role, status, tabs, permissions) + lock / unlock behind a
// confirmation. updateUserAction re-checks admin, zod and self-lockout; SQL (profiles_guard_columns)
// blocks it again.
import { useActionState, useState } from "react";
import { format, getDictionary } from "@/i18n";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { updateUserAction } from "../../server/actions-users";
import { IDLE } from "../../lib/schemas";
import type { UserRow } from "../../server/queries";
import { nextToast, useOnSuccess } from "../useOnSuccess";
import { UserEditDialog } from "./UserEditForm";

const t = getDictionary();
const a = t.adminUi;

export function UserActions({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [lockState, saveLock, savingLock] = useActionState(updateUserAction, IDLE);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  useOnSuccess(lockState, (message) => message && setToast(nextToast(message)));
  const name = user.full_name || user.email || "";

  return (
    // Fixed-width 2-column grid: the table cell cannot squeeze the buttons at 768-1024px.
    <div className="pt-row-raise grid w-60 grid-cols-2 gap-2" data-testid="user-actions">
      <UserEditDialog user={user} isSelf={isSelf} />
      {!isSelf && (
        <form action={saveLock} className="flex">
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="role" value={user.role} />
          <input type="hidden" name="isActive" value={String(!user.is_active)} />
          {user.is_active ? (
            <ConfirmSubmit label={a.lock} tone="danger" title={format(a.lockTitle, { name })} body={a.lockBody} disabled={savingLock} className={buttonClass("secondary", "sm", "w-full whitespace-nowrap border-pt-red-ink/40 text-pt-red-ink!")} />
          ) : (
            <ConfirmSubmit label={a.unlock} title={format(a.unlockTitle, { name })} body={format(a.unlockBody, { role: t.roles[user.role] })} disabled={savingLock} className={buttonClass("secondary", "sm", "w-full whitespace-nowrap")} />
          )}
        </form>
      )}
      {lockState.status === "error" && lockState.message && <div className="col-span-2"><InlineStatus tone="error">{lockState.message}</InlineStatus></div>}
      <Toast toast={toast} />
    </div>
  );
}
