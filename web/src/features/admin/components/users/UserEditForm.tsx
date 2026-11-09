"use client";
// Edit dialog of one user: name, phone, role, active, ticked tabs and permissions (0030).
// updateUserAction re-checks admin, zod and self-lockout; SQL (profiles_guard_columns) blocks it again.
import { useActionState, useState } from "react";
import { format, getDictionary } from "@/i18n";
import { ROLES, type AppRole } from "@/lib/types";
import { tabsOf, type NavTab, type Perm } from "@/lib/auth/permissions";
import { CheckboxField, SelectField, TextField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { updateUserAction } from "../../server/actions-users";
import { IDLE } from "../../lib/schemas";
import { ROLE_SUMMARY_KEY } from "../../lib/permissions";
import type { UserRow } from "../../server/queries";
import { FormDialog } from "../FormDialog";
import { useOnSuccess } from "../useOnSuccess";

const t = getDictionary();
const a = t.adminUi;
const nav = t.portalUi;

// overview / users / settings pages are admin only, so they are not offered here.
const TAB_LABEL: [NavTab, string][] = [
  ["leads", nav.navLeads],
  ["workshop", nav.navWorkshop],
  ["orders", nav.navOrders],
  ["quotes", nav.navQuotes],
  ["customers", nav.navCustomers],
];

const PERM_LABEL: [Perm, string][] = [
  ["orders.view", a.permOrdersView],
  ["orders.money", a.permOrdersMoney],
  ["orders.create", a.permOrdersCreate],
  ["orders.edit", a.permOrdersEdit],
  ["orders.status", a.permOrdersStatus],
  ["orders.delete", a.permOrdersDelete],
  ["orders.export", a.permOrdersExport],
  ["customers.edit", a.permCustomersEdit],
];

function Checks({ legend, hint, name, items, checked }: {
  legend: string; hint?: string; name: string; items: [string, string][]; checked: readonly string[];
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-pt-text">{legend}</legend>
      {hint && <p className="text-xs text-pt-muted">{hint}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {items.map(([value, label]) => (
          <CheckboxField key={value} label={label} name={name} value={value} defaultChecked={checked.includes(value)} />
        ))}
      </div>
    </fieldset>
  );
}

export function UserEditForm({ user, isSelf, onDone }: { user: UserRow; isSelf: boolean; onDone: (message?: string) => void }) {
  const [state, action, pending] = useActionState(updateUserAction, IDLE);
  const [role, setRole] = useState<AppRole>(user.role);
  useOnSuccess(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={user.id} />
      <TextField label={t.admin.fullName} name="fullName" defaultValue={user.full_name} required maxLength={120} autoComplete="off" />
      <TextField label={a.colPhone} name="phone" type="tel" defaultValue={user.phone ?? ""} maxLength={30} autoComplete="off" />
      {isSelf ? (
        // An admin cannot demote or lock himself: role and status are sent unchanged.
        <>
          <input type="hidden" name="role" value={user.role} />
          <input type="hidden" name="isActive" value="true" />
          <p className="text-sm text-pt-muted">{a.isSelf}</p>
        </>
      ) : (
        <>
          <SelectField
            label={t.admin.role}
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
            options={ROLES.map((r) => ({ value: r, label: t.roles[r] }))}
            hint={format(a.roleHint, { summary: a[ROLE_SUMMARY_KEY[role]] })}
          />
          <CheckboxField label={a.accountActive} name="isActive" defaultChecked={user.is_active} />
        </>
      )}
      {role === "admin" ? (
        <p className="text-sm text-pt-muted">{a.adminAllAccess}</p>
      ) : (
        <>
          {/* Marks that tabs / permissions are sent: an unticked box means "not granted". */}
          <input type="hidden" name="access" value="1" />
          <Checks key={role} legend={a.navTabsLabel} hint={a.navTabsHint} name="navTabs" items={TAB_LABEL} checked={tabsOf({ role, nav_tabs: user.nav_tabs })} />
          <Checks legend={a.permsLabel} name="permissions" items={PERM_LABEL} checked={user.permissions} />
        </>
      )}
      <ActionStatus state={state.status === "error" ? state : IDLE} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>{t.common.save}</button>
      </div>
    </form>
  );
}

export function UserEditDialog({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const name = user.full_name || user.email || "";
  return (
    <FormDialog
      label={a.editUser}
      title={format(a.editUserTitle, { name })}
      triggerClassName={buttonClass("secondary", "sm", "w-full whitespace-nowrap")}
    >
      {(done) => <UserEditForm user={user} isSelf={isSelf} onDone={done} />}
    </FormDialog>
  );
}
