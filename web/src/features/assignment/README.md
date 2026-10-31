# features/assignment

**Owner:** `assignment` feature builder. Only this feature edits files in this folder.

Assign / unassign leads to staff or ctv (admin only) via assign_lead RPC; notify assignee by email.

## Routes

- components used inside /admin/leads/[id] and /portal/leads/[id] (admin view)

## Data

- leads.assigned_to, lead_assignments, profiles (list)

## Rules

- Server Action must assertRole(ROLE_GROUPS.admin) then call rpc('assign_lead').
- On assignment send staff notification through features/email.

## Layout

```
assignment/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).
