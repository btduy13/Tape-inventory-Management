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
  migrations/0001..0021_*.sql schema, RLS, triggers, helpers (one concern per file)
  seed.sql                    dev users (admin/manager/staff/ctv/workshop @local.test) + sample leads
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
| `/portal`, `/portal/leads/[id]` | orders; detail page embeds `AssignPanel` (assignment), `ProductionHandoffPanel` (workshop, admin only) and `QuotePanel` (quotes, via `quotesSlot`) |
| `/portal/xuong`, `/portal/xuong/[id]` (`ROUTES.workshop*`) | workshop (admin + workshop roles; convert / assign / step Server Actions) |
| `/admin`, `/admin/users`, `/admin/presets`, `/admin/quy-cach` (tape widths + length range), `/admin/leads/[id]` | admin |
| assign/unassign actions | assignment |
| `/q/[token]`, `POST /api/q/[token]/respond`, quote editor/PDF/send | quotes |
| email templates + sender | email (library, no routes) |

## Data model (see migrations)

- `profiles` (role: admin | manager | staff | ctv | workshop, is_active). Role only changeable by admin (trigger).
- `tape_presets` admin CRUD, public read of active rows. Seeded in 0002 (landing showcase only).
- `tape_widths` (width_mm, is_active, sort_order) + single-row `tape_spec_settings` (min/max length m,
  thickness) (0022): the designer offers the active widths + a free length in range (`getTapeSpec()`,
  seed fallback); `POST /api/leads` re-checks width/length against the DB (`tape_size` error). Admin-only
  writes; `designs` stores `preset_id = null` + the chosen width/length.
- `leads` (status enum, assigned_to) + `designs` (preset snapshot, colors[1..3], design_json, logo/preview paths).
- `lead_status_log` (auto via trigger; note via `change_lead_status(lead, to, note)` RPC),
  `lead_assignments` (history), `lead_notes`.
- `quotes` + `quote_lines` (prices; only admin/manager write; totals recomputed in SQL),
  `quote_tokens` (sha256 hash, expiry; service role only).
- `rate_limits` + `check_rate_limit()` (service role only).
- `convert_lead_to_production(lead, due_date, note?, workshop_user?)` -> inserts into legacy `bang_keo_in_orders`
  (id `BK-MM-YY-NNN`, `ngay_du_kien` = due date >= today VN, `vat`/`vat_percent` from the accepted quote,
  `cong_no_khach` = subtotal + VAT like Electron `orderMath.customerDebtSqlExpression`). Caller: admin, or the
  workshop user assigned to the lead's production job (0021).
- `production_jobs` (one per lead: `order_id` -> legacy order, `workshop_user_id`, `step`, `due_date`,
  `production_note`; no customer/price columns) + `production_step_log` (who/when/note). Written ONLY by the
  SECURITY DEFINER RPCs `assign_production_job` (admin), `convert_lead_to_production`, `advance_production_step`.
  Workshop reads specs only through `workshop_jobs()` (fixed columns: size, colors, quantity, print text,
  design JSON, preview/logo paths, due date (live `ngay_du_kien`), production note, order code).
- Steps: `cho_san_xuat -> dang_in -> dang_cat_cuon -> dong_goi -> san_sang_giao -> da_giao` (+ `huy`, admin).
  Sync (forward only): lead `accepted -> production`, `san_sang_giao -> shipping`, `da_giao -> done`,
  `huy -> cancelled`; Electron `bang_keo_in_orders.da_giao` = true on `da_giao` (false again only if an admin
  moves the job back). No trigger on legacy tables; desktop edits of `ngay_du_kien` / `da_giao` are read live.

## Roles / access matrix (enforced by RLS + triggers)

| | admin | manager | staff / ctv | workshop | anon |
|---|---|---|---|---|---|
| leads read | all | all | assigned only | none | none |
| lead status | any | any | allowed steps (lib/lead-status.ts) | via production steps only | none |
| assign | yes | no | no | no | no |
| quotes write / price | yes | yes | read only (assigned) | none | none |
| users / presets | yes | read presets | read presets | read presets | read active presets |
| production jobs | all + assign + any step + huy | none | none | assigned jobs: specs, convert, next step | none |

Unassign => access disappears immediately (policies check `assigned_to = auth.uid()`; production:
`production_jobs.workshop_user_id = auth.uid() and is_workshop()`; deactivation also removes it).
Workshop users land on `/portal/xuong` (`homePathFor()` in `lib/auth/require-role.ts`); `ROLE_GROUPS.internal`
excludes them, `ROLE_GROUPS.portal` (layout) and `ROLE_GROUPS.production` include them.

## Data flows

1. **Quote request**: browser (designer state + form + Turnstile token, multipart) -> `POST /api/leads`
   -> assertSameOrigin -> checkRateLimit -> Turnstile verify -> zod -> sanitize SVG -> service-role
   insert `leads` + `designs`, upload `logos/<lead_id>/…`, `previews/<lead_id>/…png` -> emails
   (customer confirmation with mockup, admin new lead).
2. **Portal**: user-scoped client reads leads (RLS). Realtime `postgres_changes` on `leads`,
   `lead_status_log`, `lead_notes`, `quotes`, `production_jobs`, `production_step_log` (RLS-filtered).
3. **Assignment**: admin Server Action -> `rpc('assign_lead')` -> trigger sets `assigned`, logs -> email staff.
4. **Quote**: admin/manager edits lines -> PDF (@react-pdf/renderer) -> `quotes/<lead_id>/<quote_id>.pdf`
   -> token (randomToken, store sha256) -> Resend email with `/q/<token>` -> lead `quoted`.
5. **Customer response** `/q/<token>`: hash lookup (service role), expiry/revoked check, rate limit,
   accept -> quote+lead `accepted`; changes -> `changes_requested` + note -> email staff+admin.
6. **Production**: admin assigns a workshop user to an accepted lead (`assign_production_job`) or picks one in the
   hand-off form -> admin or that workshop user submits "Chuyển sang sản xuất" with a due date (default today+7)
   -> `rpc('convert_lead_to_production')` -> legacy order row (VAT + debt), job `cho_san_xuat`, lead `production`.
7. **Workshop**: `/portal/xuong` lists `workshop_jobs()` grouped by step (overdue red), detail shows the
   preview (signed URL via Storage RLS) -> one tap `advance_production_step(job, next, note)` -> log + lead /
   Electron sync -> Realtime refresh.

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
