# features/auth

**Owner:** `auth` feature builder. Only this feature edits files in this folder.

Staff login/logout (email+password, Supabase Auth), auth callback, session helpers UI.

## Routes

- /login
- /auth/callback
- logout action

## Data

- auth.users
- profiles (read own)

## Rules

- No public sign-up (config.toml enable_signup=false). Users are invited by admin (features/admin).
- Respect `?next=` param from proxy redirect, but only allow same-site relative paths.

## Layout

```
auth/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).
