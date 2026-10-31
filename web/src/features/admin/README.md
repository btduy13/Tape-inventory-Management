# features/admin

**Owner:** `admin` feature builder. Only this feature edits files in this folder.

Admin area: users & roles (invite via auth.admin with app_metadata.role), tape_presets CRUD, lead overview, 'Chuyển sang sản xuất' (convert_lead_to_production RPC).

## Routes

- /admin
- /admin/users
- /admin/presets
- /admin/leads/[id]

## Data

- profiles, tape_presets, leads, bang_keo_in_orders (via RPC only)

## Rules

- Every page: requireRole(ROLE_GROUPS.admin) (managers may view leads but not users/presets).
- Invite users with createAdminClient().auth.admin.inviteUserByEmail(email, { data: { full_name } }) then set role via app_metadata / profiles update.
- Production hand-off only through rpc('convert_lead_to_production'), never raw inserts into legacy tables.

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
