# features/orders

**Owner:** `orders` feature builder. Only this feature edits files in this folder.

Internal lead portal: lead list + detail, status changes (change_lead_status RPC), notes, status history, Realtime subscription.

## Routes

- /portal
- /portal/leads/[id]

## Data

- leads, designs, lead_status_log, lead_notes, quotes (read)

## Rules

- Use the user-scoped client (lib/supabase/server.ts / client.ts) so RLS limits staff/ctv to assigned leads.
- Status options from lib/lead-status.ts nextStatusOptions(role, status).
- Realtime: subscribe to leads / lead_status_log / lead_notes postgres_changes; refetch on unassign.

## Layout

```
orders/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).
