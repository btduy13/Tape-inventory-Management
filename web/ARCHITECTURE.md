# Web portal architecture

Next.js 16 (App Router, TypeScript, Tailwind 4) + Supabase (Auth, Postgres/RLS, Realtime, Storage).
Deploy: Vercel + own domain. Legacy Electron admin app keeps using the same Postgres DB.

> Next.js 16 note: `middleware.ts` is now **`src/proxy.ts`** (export `proxy`). Read
> `node_modules/next/dist/docs/` before using unfamiliar APIs. `cacheComponents` is OFF
> (nonce CSP needs per-request rendering).
> Windows note: the repo path contains `&`, so npm scripts call `node node_modules/<pkg>/<bin>`
> directly instead of `.bin` shims. Do not change them to bare `next`/`tsc`.

## Folder map

```
supabase/
  config.toml                 local CLI config (signup disabled)
  migrations/0001..0012_*.sql schema, RLS, triggers, helpers (one concern per file)
  seed.sql                    dev users (admin/manager/staff/ctv @local.test) + sample leads
  tests/rls/*.test.sql        pgTAP role-matrix tests (`npm run db:test`, needs Docker)
web/
  src/proxy.ts                CSP nonce + Supabase session refresh + /portal,/admin login redirect
  src/app/                    THIN route files only; import from features
  src/i18n/{vi,index}.ts      Vietnamese dictionary (sections per feature), format(), formatVnd()
  src/lib/                    shared code ONLY (owned by foundation)
    types.ts                  DB row types + supabase-js `Database` generic (mirror of migrations)
    env.ts / env.server.ts    zod-validated public / server-only env
    routes.ts                 ROUTES constants, protected prefixes
    lead-status.ts            status workflow (mirrors SQL lead_transition_allowed)
    auth/roles.ts             ROLE_GROUPS, hasRole, canManagePrices, canAssign
    auth/require-role.ts      requireRole() for pages, assertRole() for actions/handlers
    supabase/client.ts        browser client (anon key, RLS)
    supabase/server.ts        server client as logged-in user (RLS) + getCurrentProfile()
    supabase/admin.ts         SERVICE ROLE client ('server-only')
    supabase/proxy.ts         updateSession() used by src/proxy.ts
    security/csp.ts           buildCsp(), generateNonce()
    security/headers.ts       static security headers (next.config.ts)
    security/csrf.ts          assertSameOrigin() for route handlers
    security/hash.ts          sha256Hex, randomToken, timingSafeEqual
    security/rate-limit.ts    checkRateLimit(headers, RATE_LIMITS.x), hashIp()
  src/features/<name>/        one folder per feature (README.md states ownership)
  test/                       vitest setup + server-only stub
  e2e/                        Playwright (later, needs running stack)
```

Feature folder layout: `components/` (client UI), `server/` (actions, queries, handler logic,
`import "server-only"`), `lib/` (pure helpers, zod schemas), `*.test.ts`, `index.ts` (public API).
Files < ~250 lines. Features may import from `@/lib/*`, `@/i18n`, and another feature's `index.ts` only.

## Route ownership

| Route | Owner feature |
|---|---|
| `/` landing | lead-intake (sections) |
| `/thiet-ke` (`ROUTES.design`) | designer (2D) + mockup3d (3D) + lead-intake (`DesignLeadForm`, Turnstile key + CSP nonce from page) |
| `POST /api/leads` | lead-intake |
| `/login`, `/auth/callback`, `/auth/reset`, `/auth/update-password`, logout | auth |
| `/portal`, `/portal/leads/[id]` | orders; detail page embeds `AssignPanel` (assignment), `ProductionPanel` (admin) and `QuotePanel` (quotes, via `quotesSlot`) |
| `/admin`, `/admin/users`, `/admin/presets`, `/admin/leads/[id]` | admin |
| assign/unassign actions | assignment |
| `/q/[token]`, `POST /api/q/[token]/respond`, quote editor/PDF/send | quotes |
| email templates + sender | email (library, no routes) |

## Data model (see migrations)

- `profiles` (role: admin | manager | staff | ctv, is_active). Role only changeable by admin (trigger).
- `tape_presets` admin CRUD, public read of active rows. Seeded in 0002.
- `leads` (status enum, assigned_to) + `designs` (preset snapshot, colors[1..3], design_json, logo/preview paths).
- `lead_status_log` (auto via trigger; note via `change_lead_status(lead, to, note)` RPC),
  `lead_assignments` (history), `lead_notes`.
- `quotes` + `quote_lines` (prices; only admin/manager write; totals recomputed in SQL),
  `quote_tokens` (sha256 hash, expiry; service role only).
- `rate_limits` + `check_rate_limit()` (service role only).
- `convert_lead_to_production(lead)` -> inserts into legacy `bang_keo_in_orders` (id `BK-MM-YY-NNN`).

## Roles / access matrix (enforced by RLS + triggers)

| | admin | manager | staff / ctv | anon |
|---|---|---|---|---|
| leads read | all | all | assigned only | none |
| lead status | any | any | allowed steps (lib/lead-status.ts) | none |
| assign | yes | no | no | no |
| quotes write / price | yes | yes | read only (assigned) | none |
| users / presets | yes | read presets | read presets | read active presets |

Unassign => access disappears immediately (policies check `assigned_to = auth.uid()`).

## Data flows

1. **Quote request**: browser (designer state + form + Turnstile token, multipart) -> `POST /api/leads`
   -> assertSameOrigin -> checkRateLimit -> Turnstile verify -> zod -> sanitize SVG -> service-role
   insert `leads` + `designs`, upload `logos/<lead_id>/…`, `previews/<lead_id>/…png` -> emails
   (customer confirmation with mockup, admin new lead).
2. **Portal**: user-scoped client reads leads (RLS). Realtime `postgres_changes` on `leads`,
   `lead_status_log`, `lead_notes`, `quotes` (RLS-filtered).
3. **Assignment**: admin Server Action -> `rpc('assign_lead')` -> trigger sets `assigned`, logs -> email staff.
4. **Quote**: admin/manager edits lines -> PDF (@react-pdf/renderer) -> `quotes/<lead_id>/<quote_id>.pdf`
   -> token (randomToken, store sha256) -> Resend email with `/q/<token>` -> lead `quoted`.
5. **Customer response** `/q/<token>`: hash lookup (service role), expiry/revoked check, rate limit,
   accept -> quote+lead `accepted`; changes -> `changes_requested` + note -> email staff+admin.
6. **Production**: admin button -> `rpc('convert_lead_to_production')` -> legacy order row, lead `production`.

## Security rules

- Service role key only in `lib/supabase/admin.ts` / `env.server.ts` (both `server-only`).
- Every input validated with zod on the server. Every POST route handler calls `assertSameOrigin`.
- CSP with per-request nonce (`src/proxy.ts`); add new external origins ONLY in `lib/security/csp.ts`.
- Storage buckets private; read through signed URLs or RLS (`<lead_id>/` path prefix).
- Never trust client role checks; RLS is the source of truth.

## Environment variables (`.env.example`)

| Var | Scope | Purpose |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | public | Supabase project |
| NEXT_PUBLIC_SITE_URL | public | canonical origin (links in emails, CSRF allow-list) |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | public | Turnstile widget (test key locally) |
| SUPABASE_SERVICE_ROLE_KEY | server | service role client |
| TURNSTILE_SECRET_KEY | server | Turnstile verify |
| RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAILS | server | email (fake sender if key empty) |
| IP_HASH_SALT | server | hashing IPs for rate limit / audit |
| QUOTE_TOKEN_TTL_DAYS | server | customer link expiry |

## Testing notes

- Unit tests only (vitest + jsdom, mocks; no DB / Docker). `test/server-only-stub.ts` replaces `server-only`.
- `lib/security/secret-exposure.test.ts` scans `src/`: any file mentioning a server secret name
  (even in a comment) must `import "server-only"`.
- `features/quotes/lib/totals.ts` mirrors SQL rounding (`round(qty*price,2)`, VAT `round(..,0)`,
  half away from zero); tests in `quotes/lib/lib.test.ts`. Send / respond flows: `quotes/server/flows.test.ts`.
- Vitest 5 quirk: a `vi.fn()` that returns a rejected promise in a file with a `beforeEach` hook was
  reported as a test failure even when the code caught it. Avoid `beforeEach(mockReset)` there; set the
  mock per test instead (see `designer/server/presets.test.ts`).
- React Compiler lint (`react-hooks/set-state-in-effect`, `immutability`) is enforced: derive state
  (`useMemo`, `useSyncExternalStore`) instead of syncing it in effects.

## Scripts

`npm run dev | build | typecheck | lint | test | test:e2e | db:start | db:reset | db:test | db:types`
