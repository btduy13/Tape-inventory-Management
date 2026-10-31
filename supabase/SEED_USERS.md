# Seed users (LOCAL DEVELOPMENT ONLY)

Created by `supabase/seed.sql` on `npm run db:reset` (from `web/`). They exist only in the
local Docker Supabase. Never create these accounts on a hosted project.

Password for every account: `devpassword123`

| Email               | Role    | Profile id                             | Seed data                      |
|---------------------|---------|----------------------------------------|--------------------------------|
| admin@local.test    | admin   | 00000000-0000-0000-0000-00000000a001   | -                              |
| manager@local.test  | manager | 00000000-0000-0000-0000-00000000a002   | -                              |
| staff@local.test    | staff   | 00000000-0000-0000-0000-00000000a003   | lead b0001 assigned            |
| staff2@local.test   | staff   | 00000000-0000-0000-0000-00000000a005   | no leads (cross-staff checks)  |
| ctv@local.test      | ctv     | 00000000-0000-0000-0000-00000000a004   | lead b0002 assigned            |

Lead b0003 is unassigned. Local auth emails (magic link, reset) land in Mailpit:
http://127.0.0.1:54324
