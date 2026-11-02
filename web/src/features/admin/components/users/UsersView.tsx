// /admin/users body. The page calls requireRole(admin) first; the list is read through the
// admin's RLS client, then filtered / sorted in memory from whitelisted URL params.
import { format, getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { ROLES, type AppRole, type Profile } from "@/lib/types";
import {
  DataTable, FilterBar, PageHeader, Section, StatCard, StatGrid, ToneBadge, applyListInMemory,
  parseListParams, type Column, type RawParams,
} from "@/features/portal-ui";
import { USERS_SPEC, withRoleRank } from "../../lib/list-specs";
import { loadUsers, type UserRow } from "../../server/queries";
import { InviteUserDialog } from "./InviteUserForm";
import { RoleMatrix } from "./RoleMatrix";
import { UserActions } from "./UserActions";

const t = getDictionary();
const a = t.adminUi;
const BASE = ROUTES.adminUsers;
const dateFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

function RoleBadge({ role }: { role: AppRole }) {
  return <ToneBadge tone={role === "workshop" ? "amber" : role === "admin" || role === "manager" ? "blue" : "grey"}>{t.roles[role]}</ToneBadge>;
}

function columns(actorId: string): Column<UserRow>[] {
  return [
    { key: "user", header: a.colUser, sortKey: "name", mobile: "title", cell: (u) => (
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold text-pt-text">{u.full_name || "—"}</span>
        <span className="break-all text-xs font-normal text-pt-muted">{u.email}</span>
      </span>
    ) },
    { key: "role", header: a.colRole, sortKey: "role", mobile: "badge", cell: (u) => <RoleBadge role={u.role} /> },
    { key: "status", header: a.colStatus, sortKey: "status", cell: (u) => (
      <ToneBadge tone={u.is_active ? "green" : "grey"}>{u.is_active ? a.statusActive : a.statusLocked}</ToneBadge>
    ) },
    { key: "phone", header: a.colPhone, className: "hidden xl:table-cell", cell: (u) => u.phone || <span className="text-pt-muted">—</span> },
    { key: "created", header: a.colCreated, sortKey: "created", className: "hidden xl:table-cell whitespace-nowrap", cell: (u) => dateFmt.format(new Date(u.created_at)) },
    { key: "actions", header: a.colActions, cell: (u) => <UserActions user={u} isSelf={u.id === actorId} /> },
  ];
}

export async function UsersView({ actor, searchParams }: { actor: Profile; searchParams: RawParams }) {
  const { rows: all, failed } = await loadUsers(await createClient());
  const state = parseListParams(USERS_SPEC, searchParams);
  const { rows, total } = applyListInMemory(withRoleRank(all), USERS_SPEC, state);
  const filtered = !!state.q || Object.keys(state.filters).length > 0;

  return (
    <>
      <PageHeader
        title={a.usersTitle}
        description={a.usersIntro}
        breadcrumbs={[{ label: a.settings }, { label: a.usersTitle }]}
        actions={<InviteUserDialog />}
      />

      {!failed && (
        <StatGrid>
          {ROLES.map((r) => {
            const people = all.filter((u) => u.role === r);
            const locked = people.filter((u) => !u.is_active).length;
            return (
              <StatCard
                key={r}
                label={t.roles[r]}
                value={people.length - locked}
                href={`${BASE}?role=${r}`}
                hint={locked > 0 ? format(a.lockedCount, { count: locked }) : a.activeCount}
              />
            );
          })}
        </StatGrid>
      )}

      <Section variant="plain">
        <FilterBar
          basePath={BASE}
          spec={USERS_SPEC}
          state={state}
          searchPlaceholder={a.usersSearch}
          controls={[
            { kind: "select", name: "role", label: a.colRole, options: ROLES.map((r) => ({ value: r, label: t.roles[r] })) },
            { kind: "select", name: "active", label: a.colStatus, options: [{ value: "1", label: a.statusActive }, { value: "0", label: a.statusLocked }] },
          ]}
        />
        <DataTable
          caption={a.usersCaption}
          columns={columns(actor.id)}
          rows={rows}
          rowKey={(u) => u.id}
          rowClassName={(u) => (u.is_active ? "" : "bg-pt-canvas")}
          list={{ basePath: BASE, spec: USERS_SPEC, state, total }}
          filtered={filtered}
          empty={{ title: a.usersEmpty, body: a.usersEmptyBody }}
          error={failed ? a.loadError : null}
        />
      </Section>

      <Section id="phan-quyen" title={a.matrixTitle} description={a.matrixIntro}>
        <RoleMatrix />
      </Section>
    </>
  );
}

