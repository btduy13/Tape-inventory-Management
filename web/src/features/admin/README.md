# features/admin

**Owner:** `admin` feature builder. Only this feature edits files in this folder.

Admin area: users & roles (invite via auth.admin with app_metadata.role, incl. the `workshop` role), tape_presets CRUD, lead overview. "Chuyển sang sản xuất" moved to features/workshop (`ProductionHandoffPanel`).

## Routes

- /admin (AdminOverview)
- /admin/users (`UsersView`: role stats, FilterBar role/status/search, DataTable with role change + lock behind ConfirmSubmit, invite dialog, permission matrix)
- /admin/quy-cach (`TapeSpecsView`: widths table with add / up-down / on-off / delete, length range + default thickness)
- /admin/presets (`PresetsView`: table, add / edit dialog, show-hide; presets are never deleted)
- /admin/leads/[id]

Lists: specs in `lib/list-specs.ts`, read once through RLS then `applyListInMemory` (URL params whitelisted).
Up / down only shows on the unfiltered display order (`canReorder`). The permission matrix
(`lib/permissions.ts`) is display only, derived from `ROLE_GROUPS`; it grants nothing.
UI kit: `features/portal-ui` (client components import its files directly, not the index:
the index pulls AppShell -> auth server code). Local dialog wrapper: `components/FormDialog.tsx`.

## Data

- profiles, tape_presets, tape_widths, tape_spec_settings, leads

## Rules

- Every page: requireRole(ROLE_GROUPS.admin) (managers may view leads but not users/presets).
- Invite users with createAdminClient().auth.admin.inviteUserByEmail(email, { data: { full_name } }) then set role via app_metadata / profiles update.
- Production hand-off: see features/workshop (rpc only, never raw inserts into legacy tables).

## Layout

```
admin/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).
