"use client";
// Invite form (inside FormDialog). inviteUserAction re-checks admin + zod on the server.
import { useActionState, useState } from "react";
import { format, getDictionary } from "@/i18n";
import { ROLES, type AppRole } from "@/lib/types";
import { SelectField, TextField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { inviteUserAction } from "../../server/actions-users";
import { IDLE } from "../../lib/schemas";
import { ROLE_SUMMARY_KEY } from "../../lib/permissions";
import { FormDialog } from "../FormDialog";
import { useOnSuccess } from "../useOnSuccess";

const t = getDictionary();
const a = t.adminUi;

export function InviteUserForm({ onDone }: { onDone: (message?: string) => void }) {
  const [state, action, pending] = useActionState(inviteUserAction, IDLE);
  const [role, setRole] = useState<AppRole>("staff");
  useOnSuccess(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField label={t.admin.email} name="email" type="email" required maxLength={254} autoComplete="off" />
      <TextField label={t.admin.fullName} name="fullName" required maxLength={120} autoComplete="off" />
      <SelectField
        label={t.admin.role}
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value as AppRole)}
        options={ROLES.map((r) => ({ value: r, label: t.roles[r] }))}
        hint={format(a.roleHint, { summary: a[ROLE_SUMMARY_KEY[role]] })}
      />
      <ActionStatus state={state.status === "error" ? state : IDLE} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>{t.admin.sendInvite}</button>
      </div>
    </form>
  );
}

/** Header action: "Mời người dùng" button + dialog (client: the form is a render prop). */
export function InviteUserDialog() {
  return (
    <FormDialog label={t.admin.inviteUser} title={t.admin.inviteUser} description={a.inviteHint} icon="plus">
      {(done) => <InviteUserForm onDone={done} />}
    </FormDialog>
  );
}
