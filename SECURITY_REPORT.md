# Security review: web portal, Supabase, Electron

Date: 2026-10-31. Branch: `feat/web-portal`. Type: static review and fixes. No running database.
A live penetration test with Docker comes later.

Scope:

- `web/`: Next.js 16 app. Only the foundation exists so far: `src/lib/**`, `src/proxy.ts`,
  `next.config.ts`, the layout and the landing page. Every `src/features/*` folder holds only a README.
- `supabase/`: migrations 0001 to 0010, `seed.sql`, `config.toml`, pgTAP tests in `tests/rls/`.
- `electron/`: IPC, the DB action registry and `dbPolicy.js`. `electron/SECURITY.md` records an
  earlier hardening pass.

## Findings and fixes

| # | Finding | Severity | File(s) | Fix | Test |
|---|---------|----------|---------|-----|------|
| S1 | `is_service_call()` counted any connection without JWT claims as trusted server code (`coalesce(auth.role(),'service_role')`). The direct-login role `electron_app` (0010) and any future direct DB role passed the admin/service bypass in every guard trigger and RPC that relies on it. Today only `REVOKE ... FROM PUBLIC` stops that, and one missing revoke would be enough to escalate. | High | `supabase/migrations/0001_profiles_roles.sql` | `0011_security_hardening.sql`: server code now means a `service_role` JWT, or no JWT at all and `session_user` is `postgres`/`supabase_admin` or a member of `postgres`. `electron_app` is not a member, so it is no longer trusted. | `supabase/tests/rls/05_security_hardening.test.sql` (S1 block: owner, user, anon, service_role) |
| S2 | A deactivated staff or ctv user (`profiles.is_active = false`) could still read and update the leads assigned to them. `leads_select` and `leads_update` checked only `assigned_to = auth.uid()`. The access tokens stay valid for up to 1 hour, and the account stays assigned until an admin unassigns it. Realtime events follow the same policy. | High | `0003_leads_designs.sql` | Both policies now require `assigned_to = auth.uid() and public.is_internal()`. `is_internal()` checks `is_active`. | `05_*.test.sql` S2: deactivate, then 0 rows visible and the update returns nothing; reactivate, then the row is visible again |
| S3 | Every new `auth.users` row became an **active** `ctv` profile, even without `app_metadata.role`. `config.toml` disables sign-up only for local dev. On a hosted project, sign-up is a dashboard setting that is ON by default. If it stays on, anyone can register and become an internal user who can be assigned leads and appears in staff lists. | Medium | `0001_profiles_roles.sql` (`handle_new_user`) | A profile starts active only when `raw_app_meta_data` contains `role`, which only the service role can set. Every other user starts with `is_active = false`. | `05_*.test.sql` S3: a stranger sign-up is inactive and `is_internal()` is false; an invited seed user is active |
| S4a | Quote totals were not enforced. A manager could `UPDATE quotes SET total/subtotal/vat_amount` directly, so the totals no longer matched the price lines and the production hand-off (which uses `subtotal`) got the wrong value. | Medium | `0005_quotes_tokens.sql` | New BEFORE INSERT/UPDATE trigger `quotes_guard` always recomputes the totals from `quote_lines` + `vat_percent`, for every caller. | `05_*.test.sql`: preset totals on insert become 0; a direct `total = 1` edit is overridden |
| S4b | A manager (or a stolen manager session) could forge the customer's reply: `status = accepted/changes_requested`, `responded_at`, `customer_response_note`. They could also spoof `created_by` and move a quote to another lead or version. | Medium | `0005_quotes_tokens.sql` | `quotes_guard`: customer-response fields can be set only by server code (the `/q/<token>` flow). `created_by` is forced to `auth.uid()`. `lead_id`, `version`, `created_by` and `created_at` cannot change. | `05_*.test.sql`: forged acceptance, forged note and lead move are rejected; server code can still record acceptance |
| S4c | Price lines and VAT stayed editable after the quote was sent or accepted. Prices could change after the customer agreed, and no audit trail recorded it. | Medium | `0005_quotes_tokens.sql` | New trigger `quote_lines_guard` blocks INSERT/UPDATE/DELETE of lines unless the parent quote is `draft`. A line cannot move to another quote. VAT and currency are locked once the quote leaves `draft`. Changes need a new quote version. | `05_*.test.sql`: line edit, line insert and VAT edit after `sent` all fail with 42501 |
| S5 | Trigger functions and internal SECURITY DEFINER helpers kept Postgres's default `EXECUTE` grant to PUBLIC, and Supabase's default grant to anon/authenticated. | Low | 0001 to 0009 | Revoked EXECUTE on every trigger/internal function from public, anon and authenticated. `alter default privileges ... revoke execute on functions` makes future functions closed by default. | `05_*.test.sql` S5 (`has_function_privilege` checks) |
| W1 | **Rate-limit bypass.** `clientIp()` used the **leftmost** `X-Forwarded-For` entry, and the client controls that value. Sending a random XFF on every request rotates the rate-limit key for lead submission, `/q` views/answers and logo uploads. An IPv6 client also has a full /64 of addresses to rotate through. | High | `web/src/lib/security/rate-limit.ts` | New `web/src/lib/security/client-ip.ts`. It reads the IP from `x-vercel-forwarded-for`, then `x-real-ip` (both set by the Vercel edge), then the **rightmost** XFF entry (added by our proxy). Values must be valid IPs. `rateLimitSubject()` groups IPv6 by /64 and maps IPv4-mapped IPv6 to IPv4. `checkRateLimit` uses it. | `web/src/lib/security/client-ip.test.ts` |
| W2 | **Turnstile bypass by misconfiguration.** `TURNSTILE_SECRET_KEY` falls back to Cloudflare's always-pass test secret, and `IP_HASH_SALT` falls back to a public default. If production is missing those env vars, the bot check silently passes every request and IP hashes become reversible. | High | `web/src/lib/env.server.ts` | `assertProductionSecrets()` runs inside `serverEnv()`. In production (Vercel `VERCEL_ENV=production`, or `NODE_ENV=production` without `ALLOW_TEST_SECRETS=1`) it throws on any `[123]x0…AA` test secret or on the default/example salt. Preview deploys may keep the test keys. | `web/src/lib/env.server.test.ts` |
| W3 | **Open-redirect risk.** `src/proxy.ts` adds `?next=<path>` on login redirects, and the auth feature will read it. No validated helper existed. `//evil`, `/\evil` and encoded variants are the classic bypasses. | Low (preventive) | `web/src/proxy.ts`, `features/auth` (planned) | New `web/src/lib/security/safe-redirect.ts` with `safeNextPath()`. It allows only same-origin relative paths, decodes twice, rejects backslashes and control characters, and checks the origin with the URL parser. **The auth feature must use it.** | `web/src/lib/security/safe-redirect.test.ts` |
| W4 | No automated check stopped server secrets from reaching the client bundle. Only the `server-only` import convention did. | Low (preventive) | `web/src/**` | Static test: files that use the service key or other server secrets must import `server-only`. Client components must not import `@/lib/supabase/admin` or `@/lib/env.server`. No `NEXT_PUBLIC_*SECRET/SERVICE/SALT…` names. After the build, `.next/static` was grepped for secret names: no matches. | `web/src/lib/security/secret-exposure.test.ts` |

### Reviewed with no change needed

- **RLS coverage:** RLS is enabled on every table: profiles, tape_presets, leads, designs, lead_status_log,
  lead_assignments, lead_notes, quotes, quote_lines, quote_tokens and rate_limits, plus the legacy tables
  in 0009/0010. `quote_tokens` and `rate_limits` have no policies, so only service_role can use them.
  The logs can be written only by SECURITY DEFINER triggers. Every SECURITY DEFINER function sets
  `search_path = ''` and uses fully qualified names.
- **Role and price escalation:** `profiles_guard_columns` blocks self-promotion and admin self-demotion.
  `leads_guard_columns` limits staff to `status`, and `lead_transition_allowed` limits their transitions.
  Staff and ctv can read prices through RLS but have no write policy on quotes or quote_lines.
- **Storage:** all three buckets are private, with MIME and size limits. Reads are scoped to `<lead_id>/…`
  through `can_access_lead_path` (malformed paths are rejected). Writes from the browser are admin-only.
- **CSRF:** `isSameOriginRequest` checks Origin, then Referer, and rejects requests that have neither.
  Server Actions rely on Next's built-in Origin check.
- **CSP:** per-request nonce with `strict-dynamic`. No `unsafe-eval` or `unsafe-inline` in production.
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`. HSTS, nosniff, XFO,
  COOP and Permissions-Policy are set.
- **Electron:** every IPC handler goes through `handleTrusted` (checks the sender frame and URL). The
  renderer sends only action names, and `db/registry.js` builds parameterized SQL with fixed table and
  column allowlists. The remaining `${…}` SQL in `main.js` covers constant CASE fragments only, in the
  owner-only schema migration. Least-privilege `electron_app` role. 200/200 tests pass. The S1 fix also
  closes the DB-side trust gap for this role. The open items in `electron/SECURITY.md` still apply:
  fuses, code signing, PG TLS CA, plaintext portable config export.

### Not yet reviewable (features not written yet)

Update: these items were reviewed in round 2. See "Feature code review (round 2)" below.

The feature folders contain only READMEs, so these items **must be reviewed once the code exists**:
`/q/[token]` page and API (IDOR, token hashing/expiry/revocation, `last_used_at`, constant-time lookup
by hash), `/api/leads` (zod, Turnstile `siteverify` with `remoteip` and hostname check, rate limit before
any DB/email work), logo upload (magic-byte check, not only MIME; DOMPurify SVG profile with
`USE_PROFILES: {svg: true}` and no `<foreignObject>`, `href`/`xlink:href` to external or `javascript:`
URLs, or `<style>` with `url()`), designer text (render as Konva text, never as HTML), email templates
(HTML-escape all customer fields; do not put customer-supplied URLs in links), the PDF generator, and
the admin user invite flow.

## Notes for feature builders

- **Admin invite (from S3):** invited users must get `app_metadata.role` **at creation**
  (`auth.admin.createUser` / `inviteUserByEmail`, followed by `updateUserById({ app_metadata: { role } })` *before*
  first login), or the admin must set `profiles.is_active = true` together with the role. Otherwise the
  new account stays inactive.
- **Quotes (from S4):** edit lines only while the quote is `draft`. To change prices later, create
  `version + 1`. The customer response (`accepted` / `changes_requested`) must be written by the
  `/q/<token>` route handler through the service-role client.
- **New RPC functions:** EXECUTE is no longer granted by default. Add
  `grant execute on function … to authenticated` explicitly. Never grant to anon unless the
  function is meant to be public.
- **Login redirect:** use `safeNextPath(searchParams.get("next"))`.
- **Rate limits:** use `checkRateLimit(headers, RATE_LIMITS.x)`. Never build the key from
  `x-forwarded-for` yourself.

## Checks run

| Command | Result |
|---------|--------|
| `web: npm run typecheck` | pass |
| `web: npm test` (vitest) | 10 files, 54 tests pass |
| `web: npm run lint` | pass |
| `web: npm run build` | pass |
| `grep -rE "SUPABASE_SERVICE_ROLE_KEY\|service_role\|TURNSTILE_SECRET\|IP_HASH_SALT\|RESEND_API_KEY" web/.next/static` | no matches |
| `electron: npm test` | 200/200 pass |
| pgTAP (`npm run db:test`) | **not run**: needs Docker / local Supabase |

## Feature code review (round 2, 2026-10-31)

Scope: the feature code that was "not yet reviewable" in round 1. This covers `POST /api/leads`,
logo upload and SVG sanitizing, designer text and logo rendering, `/q/[token]` and
`POST /api/q/[token]/respond`, email templates and sender, quote PDF, login, callback and redirect,
every Server Action, admin invite and roles, realtime, client bundle secrets, and RPC grants.
This was a static review with unit tests only. No database, Docker or Electron was used.

### Findings and fixes

| # | Finding | Severity | File(s) | Fix | Test |
|---|---------|----------|---------|-----|------|
| W5 | **Answered quote links never expired.** `evaluateTokenAccess` returned `used` (a read-only view with customer name, company, lines and prices) **before** it checked `expires_at`. A forwarded or leaked email therefore showed the quote forever. | Low | `web/src/features/quotes/lib/token.ts` | The link expiry is checked first. An expired link is `invalid` even when it was used. A malformed date also counts as expired. | `quotes/lib/lib.test.ts` ("used links still expire") |
| W6 | **Older open versions stayed answerable.** "Create quote" while v1 was still `sent` made a v2 draft without cancelling v1. After v2 was sent, the v1 link still worked, so the customer could accept the old prices and the lead moved to `accepted`. | Medium | `quotes/server/send-quote.ts`, `send-deps.ts` | New `SendDeps.supersedeOtherQuotes`. After a successful send, every other `sent` quote of the lead is set to `cancelled` (through the user's RLS client), and its tokens are revoked (through the service role). Nothing changes when the send fails. | `quotes/server/flows.test.ts` (2 tests) |
| W7 | **Price lock bypass through a status rollback.** `quotes_guard` (0011) locked lines and VAT only while `status <> 'draft'`, and it allowed any status change except the customer statuses. A manager or a stolen session could `PATCH` a sent quote to `draft`, change the prices, and set it to `sent` again. The customer's live link then showed prices that differed from the emailed PDF, with no audit trail. This undid S4c. | Medium | `supabase/migrations/0005`, `0011` | New `0012_quote_status_transitions.sql`: a BEFORE UPDATE OF status trigger. For anyone except server code, the allowed changes are draft→sent/cancelled, sent→cancelled/expired, changes_requested/expired→cancelled, and accepted→cancelled (admin only). Nothing can return to `draft`. EXECUTE is revoked. | `supabase/tests/rls/06_quote_status_transitions.test.sql` (9 assertions, **not run**: needs Docker) |
| W8 | **Unbounded body read.** `/api/q/[token]/respond` called `req.text()` and checked the 8 KB limit only after the whole body was in memory. It is a public endpoint, rate-limited per IP only, so large bodies could exhaust memory. | Low | `quotes/server/respond-route.ts` | New `readTextCapped()`. It rejects a declared `Content-Length` above the cap, and it streams the body and cancels the read once the cap is passed. | `quotes/server/respond-route.test.ts` (CSRF, 415, 429, 413, plus the capped reader with and without Content-Length) |
| W9 | **Turnstile hostname was not checked.** `siteverify` returns the hostname where the widget was solved, and it was ignored. A token solved on another site that embeds our sitekey would pass. This is defence in depth: the sitekey's domain list in Cloudflare is the main control. | Low | `lead-intake/server/turnstile.ts`, `deps.ts` | New `hostnames` option. The hostname must match `NEXT_PUBLIC_SITE_URL` or the request's Host, and a missing hostname fails. The check is skipped only for Cloudflare test keys (`action: "test"`), and W2 already blocks those in production. | `lead-intake/server/turnstile.test.ts` |
| W10 | **Email failed open in production.** If `RESEND_API_KEY` was missing, production used the FakeSender, which reported success. A quote was then marked `sent` with a live token that the customer never received, and the fake logger wrote recipient addresses to the logs. | Low | `email/server/factory.ts` | In production the sender now always returns `ok:false` ("email not configured") and logs one error with no PII. The quote stays unsent and its new token is revoked by the existing `email_failed` path. Dev keeps the logging fake. | `email/server/factory.test.ts` |
| W11 | **Lead form as a mail relay.** The customer confirmation goes to an address the requester typed, and it greets them with a name the requester typed (120 characters, HTML-escaped but still clickable as text). Bots that get past Turnstile could send phishing text (`evil.vn/...`) from our domain. | Low | `email/templates/lead-confirmation.ts`, `email/lib/escape.ts` | New `containsLink()` (scheme, `www.`, bare domain, `@`). If the name contains one, the greeting falls back to "Xin chào quý khách," in both the HTML and text parts. Turnstile and the 5 per hour per IP limit still apply. | `email/lib/escape.test.ts`, `email/templates/templates.test.ts` |

### Reviewed with no change needed

- **`POST /api/leads`:** the order is same-origin, then rate limit (fails closed), then a streamed
  6 MB body cap, then honeypot, then Turnstile (fails closed, action checked), then zod (control
  characters stripped, phone and email normalized, note limited to 2000), then the design schema
  (`.strict()`, the preset must be active in the DB, `logo.path` is always reset), then a service-role
  insert. Files go under `<lead_id>/` with random names. The whole insert is rolled back on failure.
  Responses carry no PII, and logs contain the lead code only.
- **Uploads:** the type is detected from magic bytes (PNG, JPEG, SVG). The declared MIME and filename
  are ignored. SVG goes through DOMPurify with the svg profile; script, foreignObject, style, iframe,
  object, embed, `a` and the `style` attribute are forbidden; every attribute value must match
  `^(#…|[^:/]*)$`; external `url()` is replaced. The sanitized output is what gets stored, and the
  buckets are private with MIME and size limits. Previews must be PNG.
- **Designer:** text is drawn with Konva `Text` on a canvas. The `src/` tree has no
  `dangerouslySetInnerHTML` or `innerHTML`. Logos are sanitized in the browser too and drawn as tinted
  canvas pixels from a `blob:` URL. The server schema allows only fixed font families, hex colours,
  bounded numbers, and text with no control characters.
- **`/q/[token]`:** the raw token is 32 random bytes (base64url). Only its sha256 is stored and
  looked up, with a strict regex first. Views are rate-limited per IP. The page sets
  `robots: noindex`, `referrer: no-referrer` and is dynamic. A token is tied to exactly one quote, so
  there is no IDOR. Answers are single-use: an atomic conditional `UPDATE quote_tokens … WHERE revoked_at
  IS NULL AND expires_at > now`, then a quote update `WHERE status='sent'`. A replay or race returns
  409. The route also checks the origin, accepts JSON only, and the browser fetch uses
  `credentials: "omit"`. Brute force is not feasible (2^256).
- **Email:** every customer field is HTML-escaped (including `=` and the backtick) in the 5 templates.
  Links pass `safeUrl` (http/https/cid only). Subjects pass `oneLine` (no CR/LF), and `to`/`replyTo`
  are validated email addresses. The quote token appears only in the customer email and is never
  logged. The inline preview loader accepts only `<uuid>/<name>.png` from the `previews` bucket.
- **PDF:** @react-pdf `Text` nodes with no HTML, links or images. Fonts are local files. The
  filename is limited to `[A-Za-z0-9_-]`. Output is limited to 10 MB and stored at a path built from
  DB ids.
- **Login and redirects:** `loginAction` and `/login` use `safeNextPath`. Invite and recovery
  callbacks always land on `/auth/update-password`. Inactive or uninvited users are signed out
  straight after login. Reset does not reveal whether an account exists. Login and reset are
  rate-limited per IP.
- **Server Actions:** all 15 exported actions in the `"use server"` files call `assertRole` /
  `adminOrNull` first, validate input with zod, and run as the user (RLS). The service role is used
  only for tokens, storage, and invites after the admin check. Next.js checks the Origin of Server
  Actions.
- **Admin and roles:** the role comes only from `app_metadata` (only the service role can write it),
  never from `user_metadata`. `profiles_guard_columns` blocks self-promotion and self-lockout, and the
  UI mirrors this with `isSelfLockout`. Deactivation also bans the user in Supabase Auth.
- **Realtime:** `postgres_changes` follows RLS for INSERT and UPDATE. Supabase does not filter DELETE
  by RLS. With RLS on, the old record holds only the primary key, so the most an outsider learns is
  that a row with that UUID was deleted (checklist item 22).
- **Client bundle:** `.next/static` was grepped after this build for service-role, Turnstile secret,
  salt and Resend names: no matches. `secret-exposure.test.ts` passes.
- **RPC grants:** `convert_lead_to_production` and `assign_lead` check `is_admin()` inside the
  function. `change_lead_status` is SECURITY INVOKER (RLS and transition trigger apply).
  `check_rate_limit`, `quotes_recalc_totals`, `next_bang_keo_in_order_id` and every trigger function
  are not executable by anon or authenticated. The new `quotes_status_transition()` is revoked too.
- **Hand-off to Electron:** `convert_lead_to_production` copies customer text (name, print text) into
  `bang_keo_in_orders`. The Electron views read it through `escapeHtml`/`escapeAppHtml`, and SheetJS
  `json_to_sheet` writes strings as text cells (no formulas). No change was needed. The Electron tests
  were not run, by rule.

### Checks run (round 2)

| Command (in `web/`) | Result |
|---------|--------|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 problems) |
| `npm run test` | 45 files, 298 tests pass (was 43 / 274) |
| `npm run build` | pass, 16 routes |
| grep of `.next/static` for secret names | no matches |
| pgTAP `06_quote_status_transitions.test.sql` | **not run**: needs Docker |

## Live pentest: electron_app role (local DB)

| # | Finding | Severity | Fix | Test |
|---|---------|----------|-----|------|
| L1 | `electron_app` can `create extension dblink` (or any extension in `supautils.privileged_extensions`: dblink, http, pg_net, postgres_fdw, pg_cron, ...) although it has no CREATE on any schema or on the database and is a member of no role. Mechanism (confirmed in the local supautils build): supautils intercepts `CREATE EXTENSION` for every privileged extension and runs it as `supabase_admin` for **any** role, with no check of CREATE on the database or schema, and skips event triggers owned by non-superusers while it does. `supautils.privileged_extensions` is a `sighup` setting (no per-role override) and the before/after-create scripts live on the server file system. | High | **Partly fixed (2026-11-01, 0017); the privileged-extension path is a platform limit.** `0017_electron_role_ddl_guard.sql` adds event trigger `electron_app_ddl_guard` (`ddl_command_start`, ENABLE ALWAYS, not a login trigger). It raises 42501 for 49 DDL tags (CREATE/ALTER/DROP EXTENSION, SCHEMA, FUNCTION, PROCEDURE, TABLE, GRANT, COMMENT, ...) when `session_user` or `current_user` is `electron_app`. The role check runs in its own exception block and does nothing for any other role. It blocks every DDL path that Postgres itself runs, including extensions outside the privileged list. It cannot block privileged extensions: re-tested 2026-11-01 on the PG 17.11 and PG 15.14 images, supautils switches to `supabase_admin` before `ddl_command_start` fires and skips the postgres-owned trigger. Detective control: 0017 sets `pgaudit.log = 'ddl, role'` on `electron_app`. This is a superuser parameter: the role cannot `SET` it, and its own `alter role ... reset all` keeps it. Every `CREATE EXTENSION` it runs is logged as `AUDIT: SESSION,...,DDL,CREATE EXTENSION`. Earlier checks: database CREATE revoked (0014), no role membership (pgTAP), no schema CREATE; creation still succeeds. A `ddl_command_start` trigger owned by `postgres` never fires for it. Production steps for the owner: (1) keep the `electron_app` credential desktop-only, rotate the password, never expose it beyond the Supabase pooler; (2) best fix: replace the direct SQL login with server-side RPC/Edge Functions so no client holds a DB login; (3) optionally ask Supabase support to remove unused network extensions (`dblink`, `http`, `pg_net`, `postgres_fdw`) from `supautils.privileged_extensions` for the project; (4) after any incident run `select extname, extowner::regrole, extnamespace::regnamespace from pg_extension` and drop what you did not install. | `12_electron_role_ddl_guard.test.sql` (16 real tests: trigger shape; CREATE SCHEMA, CREATE FUNCTION, non-privileged CREATE/ALTER EXTENSION, COMMENT and CREATE TABLE refused with 42501; postgres and service_role DDL unaffected; pgaudit setting). `08_*`: non-privileged extension refused (real test), plus one pgTAP TODO for the supautils privileged path (platform limit) |
| L2 | `electron_app` can run `alter role electron_app set ...` (stock Postgres for a role's own settings) and so replace the 0010 guards (`search_path`, `statement_timeout`, `idle_in_transaction_session_timeout`) for its own later sessions. | Low | **Accepted risk, not fixed.** The `on login` event trigger from the first 0014 draft was removed: a failing login trigger blocks logins, and it caused lockout regression R1. Impact stays inside the role's own sessions: it cannot set superuser-only parameters, it has no CREATE on any schema (a changed `search_path` finds nothing new), and a drifted `role` / `session_authorization` setting is rejected at login with a WARNING (verified: login still works). A live session can always `SET` these USERSET values anyway. Owner repair, as `postgres`: `alter role electron_app reset all;` then re-run the three `alter role electron_app set ...` lines from 0010. | `08_*.test.sql`: no `login` event trigger installed, guard/restore functions absent |
| L3 | `electron_app` could create temp tables and `pg_temp` functions, because TEMP on a database is granted to PUBLIC by default. | Low | 0014: on every connectable, non-template database owned by the migration role (`postgres`; locally also `_supabase` and `storage_vectors`), TEMP is revoked from PUBLIC and granted back to every other non-builtin role; `electron_app` loses TEMP and CREATE. On the databases other than the current one, CONNECT is also revoked from PUBLIC and granted back to the other roles, so `electron_app` can log in only to `postgres`. Not changeable: `template1` (owned by `supabase_admin`) keeps PUBLIC CONNECT (no PUBLIC TEMP), see R3. New roles do not get TEMP unless granted. | `08_*.test.sql`: no TEMP for `electron_app` on any database, no PUBLIC TEMP and no default ACL on owner databases, no CONNECT to the other owner databases, other roles keep TEMP, temp table and pg_temp function both fail with 42501 |
| L4 | `electron_app` can call `pg_catalog.lo_from_bytea` / `lo_create` / `lowrite` and keep any amount of data in `pg_largeobject`, outside its five tables (disk fill, hidden storage). `postgres` could not remove it ("must be owner of large object"). | Low | **Partly fixed (platform limit).** The `lo_*` functions are owned by `supabase_admin` and granted to PUBLIC; a migration run as `postgres` cannot revoke them. `0015_electron_role_large_objects.sql`: `postgres` now inherits `electron_app` (one-way), so the owner can unlink its objects; owner-only `electron_app_purge_large_objects()` unlinks all of them. It no longer runs on login (login trigger removed, see L2); the owner runs it by hand or from a scheduled job. Full fix needs `revoke execute on function lo_* from public` run as `supabase_admin`. Re-checked 2026-11-01: `lo_from_bytea`, `lo_create`, `lo_creat`, `lowrite`, `lo_put` and `lo_open` still have a NULL ACL (PUBLIC) and owner `supabase_admin`, so `postgres` still cannot revoke them. Kept as accepted. `verify-production.sql` reports any `electron_app` large object as FAIL. | `09_electron_role_large_objects.test.sql` (membership, owner-only purge, objects created as `electron_app` are removed by the purge); pgTAP TODO for creation itself |
| L5 | `electron_app` can `notify pgrst, 'reload schema'`, which makes PostgREST reset its connection pool and reload the schema cache and config. Sent in a loop it degrades the web API (DoS). It cannot change PostgREST config. | Low | **Accepted risk, not fixed.** Postgres has no privilege check for NOTIFY and no per-channel ACL, and Supabase does not expose PostgREST's `db-channel` setting, so there is no cheap fix. Mitigation is the same as L1: keep `electron_app` desktop-only with a rotated password, or move to server-side RPC. Watch `supabase_rest` logs for repeated "Received a schema cache reload message". Re-checked 2026-11-01: still no mechanism. NOTIFY is not DDL, so the 0017 trigger does not see it. | `10_electron_role_notify.test.sql`, pgTAP TODO test (fails until the platform allows a block) |

## Live pentest (local stack)

Run on 2026-10-31 against the local stack only: web app `http://localhost:3000` (`next start`, production
build), Supabase API `http://127.0.0.1:54321`, DB container `supabase_db_tape-portal` (PG 17.11), Mailpit
`:54324`. No remote project or real database was touched. Electron was not started. All findings came from
the `electron_app` direct SQL login. The rows L1 to L5 above give the fix detail; this table records status
after the finalize round.

### Findings

| ID | Severity | Title | Location | Fixed | Verified | Regression test |
|----|----------|-------|----------|-------|----------|-----------------|
| electron-app-create-extension (L1) | High | `electron_app` can `CREATE EXTENSION dblink` with no CREATE privilege on the schema or database (supautils privileged-extension path) | `supabase/migrations/0010_electron_role.sql` (role setup); live DB | Partly. The 0017 event trigger blocks all other DDL and non-privileged extensions. Privileged extensions are still a platform limit, now logged by pgaudit | Gap re-confirmed 2026-10-31 in a rolled-back transaction (`seg` installed as `supabase_admin` in `public` while `has_database_privilege(..., 'CREATE')` = false); also works in `template1`, see R3. No leftover extensions | `supabase/tests/rls/08_electron_role_lockdown.test.sql` (pgTAP TODO, still reports "caught: no exception") |
| electron-app-alter-own-role-settings (L2) | Low | `electron_app` can `alter role electron_app set ...` and override the 0010 `search_path` / `statement_timeout` / idle-timeout guards | `supabase/migrations/0010_electron_role.sql:46-48` | No, accepted risk (login trigger removed because of R1) | Yes: with a `role = 'postgres'` drift set by `electron_app`, the next `electron_app` login still works (WARNING only, `current_user` = `electron_app`); drift then reset by `postgres` | `08_electron_role_lockdown.test.sql` (no login event trigger, functions removed) |
| electron-app-temp-objects (L3) | Low | `electron_app` can create temp tables and `pg_temp` functions (TEMP inherited from PUBLIC) | fix in `0014_electron_role_lockdown.sql` | Yes, on `postgres`, `_supabase`, `storage_vectors` | Yes: temp table fails in `postgres` and `template1`; login to `_supabase` and `storage_vectors` fails with "User does not have CONNECT privilege" | `08_electron_role_lockdown.test.sql` (checks every database in `pg_database`) |
| electron-app-large-object-write (L4) | Low | `electron_app` can write and keep any data in `pg_largeobject` via `lo_from_bytea` / `lo_create` / `lowrite` | partial fix in `0015_electron_role_large_objects.sql` | Partly (`postgres` can unlink; owner-only purge function; no automatic purge) | Owner unlink and owner-only purge confirmed; `lo_from_bytea` still executable | `supabase/tests/rls/09_electron_role_large_objects.test.sql` (plus pgTAP TODO for creation itself) |
| electron-app-notify-pgrst-reload (L5) | Low | `electron_app` can `NOTIFY pgrst`, forcing PostgREST to reset its pool and reload schema cache/config (DoS in a loop) | Postgres NOTIFY (no ACL); affects `supabase_rest` | No, accepted risk (no per-channel NOTIFY ACL, `db-channel` not configurable on Supabase) | Not re-verified (documented gap) | `supabase/tests/rls/10_electron_role_notify.test.sql` (pgTAP TODO, rolled-back transaction) |

### Attack surfaces that held

- `electron_app` schema isolation: `create table public.*` and `create function public.*` fail with
  "permission denied for schema public"; `auth` schema stays "permission denied" even with `search_path`
  changed; the role is a member of no other role (pgTAP).
- Checklist item 3, re-checked 2026-10-31 (as `supabase_admin`, `set role electron_app`): `select
  public.is_service_call()` fails with "permission denied for function is_service_call"; no SELECT on
  `leads`, `quotes`, `profiles`; EXECUTE denied on `assign_lead`, `convert_lead_to_production`,
  `check_rate_limit`.
- Privilege escalation from `electron_app`: `set role postgres` denied, `set event_triggers = off` denied,
  `alter large object ... owner to authenticator` denied, the purge SECURITY DEFINER function is not
  executable by `electron_app` or `authenticated`. A drifted `role=postgres` setting is denied and never
  applied to a session.
- `0015` membership is one-way: `postgres` inherits `electron_app` (inherit=t, set=f); `electron_app` gains
  nothing.
- No `login` event trigger exists any more, so a broken trigger can no longer block logins (R1 closed).
- `npm run db:test` on the local DB after the finalize round (0014/0015 changes applied by hand as
  `postgres`, no `db reset`): 10 files, 113 tests, PASS; the L1, L4 and L5 gaps show as TODO failures.

### Remaining risks

- **R1 (closed):** the login event trigger and its guard/restore functions are removed (0014 drops them if
  present). A drifted `role` setting now only causes a WARNING at login; verified that `electron_app` still
  logs in.
- **R2 (closed locally):** TEMP and CONNECT are revoked from PUBLIC on `_supabase` and `storage_vectors`.
  On hosted Supabase these databases may not exist or may not be owned by `postgres`; the 0014 loop skips
  any database `postgres` does not own. Check `select datname, datdba::regrole, datacl from pg_database`
  on the hosted project after the first deploy.
- **R3 (new, Low):** `electron_app` can connect to `template1` (PUBLIC CONNECT, owned by `supabase_admin`,
  not changeable from a migration) and, through L1, create extensions there. Databases created later from
  `template1` would inherit them. No TEMP there. Production step: ask Supabase support to
  `revoke connect on database template1 from public`, or make sure only the pooler (database `postgres`)
  is reachable.
- **L1 (High, partly fixed by 0017), L4, L5:** platform limits remain for the supautils privileged-extension path, large objects and NOTIFY. The real mitigation is the same for all three: keep
  `electron_app` off the network (desktop only, rotated password), or replace the direct SQL login with
  server-side RPC/Edge Functions. Full L4 fix needs `revoke execute on function lo_* from public` run as
  `supabase_admin`.
- **L2 (accepted):** the role can change its own role-level and session-level settings (own sessions only).
- Web portal, REST, Storage, Realtime and Mailpit checks (items 5 to 25 below) were not part of the
  `electron_app` round. The later "Security regression suite" covers most of them; see the ticks below.

## Security regression suite

Added 2026-10-31. These are integration tests that run against the local stack only: the web app as a production build
(`next start`), local Docker Supabase and Mailpit. Run `npm run test:security` in `web/`. The config is
`web/vitest.security.config.mts`, and the run is not part of `npm run test`. The SQL side runs with `npm run db:test`
(pgTAP, `supabase/tests/rls/`).

### Suites and rules covered

| Suite (`web/tests/security/`) | Files | Rules covered |
|---|---|---|
| `access/` | 14 | Anonymous users cannot read or write lead data. Staff and ctv see only their assigned leads, and are isolated from other staff on leads, designs, quotes, lines, notes and history. Exact counts and embedded relations reveal no hidden rows. Staff cannot change assignment or customer fields. Price lines are locked for staff and editable only on drafts by admin or manager. History tables are append-only. Role and `is_active` changes are admin-only, with no self-promotion. RPCs match a reviewed allowlist, and server-only functions cannot be called. GraphQL follows the same rules. Sign-up, anonymous sign-in and OTP account creation are disabled. Storage `logos` list, download, signed URL and upload are denied to outsiders, including `../` paths. Realtime events stop after unassignment and after deactivation, and DELETE events carry only the primary key. Deactivated users with a still-valid token cannot act. |
| `intake/` | 9 | Body caps: early 413 on Content-Length, and 413 on chunked bodies with no truncation. Captcha uses the Cloudflare test secrets and checks the action and hostname. The rate limit of 5 per hour cannot be bypassed with spoofed forwarding headers and shares one bucket per IPv6 /64. Schema checks cover types, lengths, control characters, bidi characters and decimal-only quantity. Server-owned fields and storage paths cannot be set by the client. Uploads are checked for size, type sniffing and SVG sanitizing. In emails, user fields are escaped, recipients are fixed, and the confirmation carries no requester-supplied link text. |
| `quotes/` | 11 | Customer links (`/q/<token>`) use a body cap, reject bad Origin values (CSRF), expire, are single-use and get revoked when superseded. Invalid tokens get a uniform response. Concurrent answers produce exactly one record. A manager cannot answer. After a quote is sent, its price lines and its terms are locked (`notes`, `valid_until`, `pdf_path`, `sent_at`). |
| `webapp/` | 13 | Auth cookies are HttpOnly, SameSite and Secure in production. Login and password reset do not reveal whether an account exists. Login `next=` allows only same-site paths. The client bundle has no secrets. Error pages do not leak data. CSP, nosniff and HSTS are sent on every route. Server Actions refuse a mismatched Origin. Staff cannot run admin actions or open admin pages. Portal pages, email templates and the quote PDF escape or neutralize hostile input. |
| pgTAP `supabase/tests/rls/` | 11 | RLS, guards, quote status transitions (06) and the `electron_app` lockdown (08 to 10). `11_sent_quote_terms_inactive_profile.test.sql` is new and covers the 0016 fixes. |

### Defects found and fixes

All 14 defects are fixed. None is committed yet.

| ID | Severity | Defect | Fix | Test |
|----|----------|--------|-----|------|
| INTAKE-RL-1 | High | `clientIp()` trusted `x-vercel-forwarded-for`, `x-real-ip` and the rightmost XFF entry without any proxy check. Under `next start`, each spoofed IP got its own bucket, so 8 of 8 requests passed and none returned 429. | `lib/security/client-ip.ts`: `clientIp(headers, mode)` trusts a header only when the new `TRUSTED_PROXY` env (`vercel`, `x-real-ip`, `xff` or `none`) says so. It defaults to `vercel` when `VERCEL=1`, and otherwise to `none`, which ignores every header (the client is then `unknown`). In production, `rate-limit.ts` warns once when no proxy is set. The env is documented in `.env.example`. | `intake/rate-limit.test.ts` |
| WEBAPP-1 | High | Open redirect: `safeNextPath()` returned `url.pathname` after dot-segment removal, so `/.//evil.example`, `/..//…`, `/portal/..//…` and `/%2e//…` became `//evil.example`. This affected the 307 for a logged-in user, the `loginAction` redirect and the hidden `next` input. | `lib/security/safe-redirect.ts` checks the path again after URL parsing, and these inputs now fall back to `/portal`. | `webapp/login-next-redirect.test.ts`, unit test `safe-redirect.test.ts` |
| INTAKE-BODY-1 | Medium | The proxy matcher included `/api/leads`, so Next.js buffered and cloned up to 10 MB before the route ran. A declared 50 MB with a slow sender got no answer. | `proxy.ts`: the matcher now skips `api/`. Both API routes set their own CSP through `withCsp()` (`lib/security/csp.ts`). `/api/leads` `GET` returns 405. `handle-lead-submit.ts` rejects an oversized Content-Length before the rate limit. After a 413, `read-body.ts` drains up to 2x the cap in the background, so the client gets the reply and the keep-alive socket is left clean. | `intake/body-size.test.ts` |
| WEBAPP-2 | Medium | Auth cookie `sb-127-auth-token` was not HttpOnly (an `@supabase/ssr` default) and had a Max-Age of 400 days. | New `lib/supabase/cookie-options.ts` (`httpOnly: true`, `sameSite: lax`), used by `server.ts` and `proxy.ts`. The browser Realtime client (`client.ts`) now gets a short-lived access token from the Server Action `lib/supabase/realtime-token.ts` and caches it until just before expiry. The refresh token never reaches the browser. | `webapp/auth-cookie-flags.test.ts` |
| WEBAPP-3 | Medium | The auth cookie had no `Secure` in the production build. | `cookie-options.ts` sets `secure` in production builds. | `webapp/auth-cookie-flags.test.ts` |
| QUOTE-TERMS-1 | Medium | A manager or admin could change `notes` on a sent or accepted quote. `/q/<token>` then showed text that was not in the emailed PDF. | `0016_sent_quote_terms_inactive_profile.sql` replaces `quotes_guard()`. Once a quote is not `draft`, end users get 42501 when they change `notes`, `valid_until`, `pdf_path` or `sent_at`. The send flow still re-sends the same version, so `markSent` (`features/quotes/server/send-deps.ts`) now uses the service client. It updates only quotes in `draft` or `sent`, and it fails when no row changed. The caller still checks the role and reads the quote through RLS first. | `quotes/sent-terms-lock.test.ts`, pgTAP 11 |
| QUOTE-TERMS-2 | Low | `valid_until` could be extended on a sent or accepted quote, which re-opened acceptance after expiry. | Same as QUOTE-TERMS-1. | same |
| QUOTE-TERMS-3 | Low | `pdf_path` and `sent_at` (the audit record of what was sent) could be rewritten. | Same as QUOTE-TERMS-1. | same |
| INTAKE-BODY-2 | Low | An 11 MB chunked body was cut to 10 MB by the proxy and returned 422 instead of 413. | Same as INTAKE-BODY-1: the proxy no longer handles `api/`. | `intake/body-size.test.ts` |
| INTAKE-EMAIL-1 | Low | `containsLink()` missed IDN domains such as `bánhmì.vn`, so the requester's name reached the confirmation mail. | `features/email/lib/escape.ts` now matches Unicode letters, plus full-width dots and `＠`. | `intake/email-confirmation.test.ts`, unit test `escape.test.ts` |
| INTAKE-SVG-1 | Low | `data:image/svg+xml` was kept on `<image>`, so a nested `<svg onload>` was stored. | `sanitize-svg.ts` adds a DOMPurify hook for each sanitize call only. It drops any `data:` href that is not base64 PNG or JPEG. | `intake/upload-svg.test.ts`, unit test `sanitize-svg.test.ts` |
| INTAKE-SCHEMA-1 | Low | Bidi override and isolate characters (U+202E, U+2066 to U+2069) were stored in `customer_name` and `company`. | `lead-schema.ts` also strips U+061C, U+200E/F, U+202A to U+202E and U+2066 to U+2069. | `intake/schema-validation.test.ts`, unit test `lead-schema.test.ts` |
| INTAKE-SCHEMA-2 | Low | `quantity='0x10'` was stored as 16, through `z.coerce.number()`. | New `parseQuantity()` removes `.`, `,` and spaces, then accepts only 1 to 9 decimal digits. `0x10`, `0b101`, `1e3` and `Infinity` now return 422. | `intake/schema-validation.test.ts`, unit test `lead-schema.test.ts` |
| access-deactivated-profile-self-update | Low | A deactivated user with an old token could still `PATCH` their own `profiles.full_name` and `phone`. | `0016`: `profiles_update_self` now requires `id = auth.uid() and public.is_internal()` in both USING and WITH CHECK. | `access/deactivated.test.ts`, pgTAP 11 |

Test infrastructure changed without weakening any assertion:

- In `vitest.security.config.mts`, `fileParallelism: false` is set, because all files share one live rate-limit bucket now that spoofed IPs no longer split it.
- The same config sets `TRUSTED_PROXY=x-real-ip` for the in-process handler tests only. These tests model a trusted edge. The live server runs with no proxy setting.
- Suites that do not test rate limiting now clear their own buckets with the service key (`helpers/rate-limits.ts`). Before, they spoofed a new client IP.

### Final results

- `npm run test:security`, last full run against a fresh production build on `:3001`: **45 files, 426 tests passed**. Before that run, migration 0014 was re-applied by hand after `db:reset`, and one leftover rate-limit row was cleared in the local DB. The `:3001` server has been stopped. `:3000` and the Supabase containers were not touched.
- `npm run db:test` after the `electron_app` finalize round: 10 files and 113 tests passed. The only failures are the expected TODO tests for L1, L4 and L5. pgTAP 11 (0016) was added later and is included in the suite.
- New unit tests: `client-ip`, `safe-redirect`, `escape`, `sanitize-svg` and `lead-schema`.

### Open after this round

- **Realtime with HttpOnly cookies** has not been tested in a real browser. The token-from-Server-Action path is covered only indirectly by `access/realtime*.test.ts`, which use their own clients. Check live updates in the portal before launch.
- **`TRUSTED_PROXY` must match the deployment.** On Vercel the default (`vercel`) is right. A self-hosted `next start` behind nginx or a CDN needs `x-real-ip` or `xff`, and that proxy must overwrite the header. With `none`, every client shares one `unknown` bucket. That is safe, but one abuser can then block all lead submissions (5 per hour in total).
- **Fresh `db reset`.** The revised 0014 was applied by hand. Run one clean `supabase db reset` followed by `npm run db:test` and `npm run test:security` before the first hosted deploy.
- The `electron_app` platform limits L1 (High), L4 and L5 and the residual risk R3 are unchanged. See above.
- A manager can still set a quote from `sent` to `expired`. 0012 allows this by design.

## Needs live verification with Docker (later pentest)

Items marked **[x]** were exercised in the local live pentest or the security regression suite above;
**[~]** means partly (the rest is noted on the item).

1. **[~]** `supabase db reset` applies 0001 to 0011 cleanly, and `npm run db:test` passes all 5 pgTAP files.
   File 05 has 24 assertions and has not been executed yet.
   Live: DB reset done, migrations 0001 to 0015 applied. `npm run db:test` passed (10 files, 113 tests) after
   the revised 0014/0015 were applied by hand; a fresh `db reset` with the revised files is still pending.
2. Under the CLI version in use, `session_user` for migrations and seed is `postgres` or a member of it,
   so `is_service_call()` still treats seed/migration updates as server code. If the CLI logs in as
   another role, the seed's `update leads set assigned_to` fails.
3. **[x]** Connect as `electron_app` and confirm `select public.is_service_call()` returns false, no access to
   `leads`/`quotes`/`profiles`, and EXECUTE denied on `convert_lead_to_production`, `assign_lead` and
   `check_rate_limit`.
   Live: all hold (`is_service_call` is not even executable; see "Attack surfaces that held").
4. Trigger functions still fire after `REVOKE EXECUTE` (expected: EXECUTE is checked only at CREATE TRIGGER).
5. **[x]** Realtime: staff stop receiving `leads`/`lead_status_log` events right after they are unassigned **and**
   right after they are deactivated. DELETE events do not leak old rows (replica identity full + RLS).
    Suite: `access/realtime-revocation.test.ts` (unassign, deactivate) and `access/realtime.test.ts` (DELETE carries only the PK).
6. **[x]** PostgREST as staff: `PATCH /leads?id=eq.<other>`, `PATCH /quotes`, `POST /quote_lines`, `GET /quote_tokens`,
   `POST /rpc/quotes_recalc_totals`, `POST /rpc/check_rate_limit`, `POST /rpc/next_bang_keo_in_order_id`.
   All must be denied or return empty.
    Suite: `access/lead-columns.test.ts`, `price-lines.test.ts`, `rpc-roles.test.ts`, `counts-embeds.test.ts`, `anonymous.test.ts`.
7. **[~]** Storage as staff: list and download objects of unassigned leads in logos/previews/quotes (expect deny),
   upload (expect deny), path tricks (`../`, a non-uuid prefix, URL-encoded slashes).
    Suite: `access/storage-logos.test.ts` covers list, download, signed URL, upload, delete and `../` for `logos`. The `previews` and `quotes` buckets are not covered yet.
8. **[~]** A sanitized SVG served from the Storage origin (signed URL) runs no script when opened directly.
   Confirm the stored `Content-Type` and consider `Content-Disposition: attachment` for SVG downloads.
    Suite: `intake/upload-svg.test.ts` covers the sanitizing and the stored `image/svg+xml` type (and INTAKE-SVG-1). Opening the file in a browser and `Content-Disposition` are not tested.
9. **[~]** Hosted project auth settings: sign-up disabled, email confirmations on, redirect allow-list limited to
   the production domain plus `/auth/callback`, JWT expiry, leaked-password protection.
    Local only: `access/signup-disabled.test.ts`. The hosted project settings still need a check.
10. **[~]** On Vercel: confirm that `x-real-ip` / `x-vercel-forwarded-for` cannot be overridden by the client, so the
    rate limit holds against spoofed `X-Forwarded-For` and per-/64 IPv6 rotation. Confirm that Turnstile
    `siteverify` rejects reused tokens and wrong hostnames.
    Suite: `intake/rate-limit.test.ts` (spoofed headers, IPv6 /64; INTAKE-RL-1 fixed) and `intake/captcha.test.ts` (spent and foreign-hostname tokens). Confirming the Vercel header behaviour live is still open.
11. **[~]** CSP in a real browser: no violations on `/`, `/thiet-ke` (Konva + three.js + Turnstile iframe) and `/q/<token>`.
    Nonce-only `style-src` may block libraries that inject `<style>` tags or set the `style` attribute.
    Check routes skipped by the proxy matcher (paths ending in `.png`/`.svg`, which carry no CSP header).
    Suite: `webapp/security-headers.test.ts` checks the headers and the nonce. A real-browser violation check is still open.
12. **[x]** CSRF: cross-origin `fetch`/form POST to every route handler and Server Action with the auth cookie (expect 403).
    Suite: `quotes/csrf-origin.test.ts`, `webapp/server-action-origin.test.ts`.
13. **[~]** `/q/<token>`: brute force and enumeration timing, expired or revoked token, token for quote A used to
    answer quote B, replay after acceptance, rate limit per IP and per token.
    Suite: `quotes/invalid-token`, `expired-token`, `single-use`, `superseded-version`, `concurrent-response`. Timing analysis and per-token rate-limit tests are not done.
14. **[x]** Email (Resend): HTML injection through customer name, company or note in every template. Make sure
    customer input cannot change the recipient or headers.
    Suite: `webapp/xss-email-templates.test.ts`, `intake/email-confirmation.test.ts` (Mailpit, not Resend).
15. **[x]** Quote status (W7, migration 0012): as manager over PostgREST, `PATCH /quotes?id=eq.<sent>` with
    `status=draft` must return 42501. Edit lines, then set `sent` again: this must also fail. Admin can
    cancel an accepted quote, manager cannot. Run `supabase/tests/rls/06_quote_status_transitions.test.sql`.
    Suite: `quotes/price-lock.test.ts`, `sent-terms-lock.test.ts` (QUOTE-TERMS-1/2/3 fixed in 0016); pgTAP 06 runs in `db:test`.
16. **[x]** Superseded versions (W6): send v1, create a new draft with "create" (not "new version"), send v2.
    The v1 link must now show "link expired", and `POST /api/q/<v1 token>/respond` must return 404.
    Suite: `quotes/superseded-version.test.ts`.
17. **[x]** Used links (W5): answer a quote, then move `quote_tokens.expires_at` into the past. `/q/<token>`
    must no longer show prices or names.
    Suite: `quotes/single-use.test.ts`.
18. **[x]** Body caps: `POST /api/q/<token>/respond` with a 1 MB chunked body and no Content-Length must
    return 413 quickly, and server memory must not grow. Also send a 6 MB+ multipart to `/api/leads`.
    Suite: `quotes/body-size.test.ts`, `intake/body-size.test.ts` (INTAKE-BODY-1/2 fixed).
19. **[~]** Turnstile hostname (W9): solve the widget on another origin that embeds our sitekey (localhost
    with a real key), then post that token to `/api/leads`. Expect `captcha`. Check that both www and
    apex hostnames still pass.
    Suite: `intake/captcha.test.ts` covers foreign hostname and action in-process, with a mocked siteverify. The real widget on another origin is not tested.
20. Production email without `RESEND_API_KEY` (W10): sending a quote must show "email failed". The
    quote must stay `draft`, no token may stay live, and logs must not contain recipient addresses.
21. **[x]** Lead confirmation relay (W11): submit a lead with a third-party email and a name that contains
    `evil.vn` or `https://…`. The mail must greet "quý khách" and contain no link text. Also confirm
    the 5 per hour per IP limit and Turnstile stop bulk sending.
    Suite: `intake/email-confirmation.test.ts` (INTAKE-EMAIL-1 fixed) and `intake/rate-limit.test.ts`.
22. **[x]** Realtime DELETE events: as a logged-in but inactive user (or staff on another lead), subscribe to
    `postgres_changes` on `leads`/`lead_notes`/`quotes`. An admin then deletes a row. Supabase does not
    apply RLS to DELETE events. Confirm that the payload carries only the primary key (`old.id`), with
    no name, phone or price.
    Suite: `access/realtime.test.ts` (staff on another lead). `access/deactivated.test.ts` covers the inactive user's reads.
23. **[~]** Server Actions: replay each action ID (from the client bundle) as `POST /portal` with a staff
    cookie and another lead's UUID: `sendQuoteAction`, `saveQuoteDraftAction`, `createQuoteVersionAction`,
    `getQuotePdfUrlAction`, `assignLeadAction`, `updateUserAction`, `inviteUserAction`,
    `convertToProductionAction`, `changeStatusAction` and `addNoteAction`. Expect a forbidden message
    or an RLS empty result. Send a cross-origin `Origin` and expect Next.js to reject it.
    Suite: `webapp/staff-admin-actions.test.ts` (`assignLeadAction`, `updateUserAction`, `inviteUserAction`, `convertToProductionAction`) and `webapp/server-action-origin.test.ts`. The quote and note actions are not replayed yet.
24. **[~]** Auth callback: `/auth/callback?type=recovery&token_hash=…&next=https://evil` must land on
    `/auth/update-password`. `next=//evil`, `/%5Cevil` and `/%252F%252Fevil` must fall back to `/portal`.
    Suite: `webapp/login-next-redirect.test.ts` covers `/login?next=` and the login action (WEBAPP-1 fixed). `/auth/callback` is not tested yet.
25. Admin invite: invite an existing confirmed email and expect "email exists" with no role change.
    As staff, `auth.updateUser({ data: { role: "admin" } })` (user_metadata) must not change
    `profiles.role` or RLS results, because only `app_metadata` is read.

### Production step: lock down `storage_vectors` (after first deploy)

This step is now scripted. Run `supabase/scripts/production-post-deploy.sql` once as `postgres`, then run `supabase/scripts/verify-production.sql` (see "Round 2026-11-01" below). The manual statements stay here for reference.

The Storage service creates the `storage_vectors` database after migrations run, so migration 0014 cannot revoke its default `PUBLIC` `CONNECT`/`TEMP`. Run once as `postgres` after the production project is up, then re-run `supabase/tests/rls/08_electron_role_lockdown.test.sql` (its 4 TODO tests should pass):

```sql
revoke connect, temporary on database storage_vectors from electron_app;
revoke temporary on database storage_vectors from public;
```

Risk if skipped: low. `electron_app` could connect to an empty database and create temporary objects there; it cannot reach any application data.

## Round 2026-11-01: electron_app DDL guard, advisors, production scripts

This round used the local stack only. No remote project or production database was touched.

### Changes

| Item | Change | Test |
|------|--------|------|
| L1 | `supabase/migrations/0017_electron_role_ddl_guard.sql` adds event trigger `electron_app_ddl_guard` on `ddl_command_start`. It covers 49 DDL tags, is ENABLE ALWAYS and is not a login trigger. It raises 42501 when `session_user` or `current_user` is `electron_app`. Function `public.electron_app_ddl_guard()` is plpgsql with `search_path = pg_catalog, pg_temp`. It is not SECURITY DEFINER, and EXECUTE is revoked from PUBLIC and the API roles. The role check runs in its own exception block, so the function never raises for another role. 0017 also runs `alter role electron_app set pgaudit.log = 'ddl, role'`, a detective control for the privileged-extension path. | `supabase/tests/rls/12_electron_role_ddl_guard.test.sql` (16 tests), `08_*` test 14 |
| L1 limit | `electron_app` can still install privileged extensions (`supautils.privileged_extensions`, which includes `dblink`, `http`, `pg_net`, `postgres_fdw` and `seg`). supautils runs them as `supabase_admin` and skips non-superuser event triggers. Re-proven in a rolled-back transaction: the trigger refuses `create schema`, but `create extension seg` succeeds. This stays as one pgTAP TODO in `08_*` (test 15). The owner actions are unchanged: keep the credential desktop-only, rotate it, move to RPC long-term, and ask support to trim the list. The pgaudit log now records each attempt. | `08_*` TODO 15 |
| L4 | Re-checked, and no safe mechanism exists. The `lo_*` functions are owned by `supabase_admin` with a NULL ACL, and `postgres` cannot revoke them. Accepted. | `09_*` TODO 7 |
| L5 | Re-checked, and no mechanism exists: NOTIFY has no ACL and is not DDL. Accepted. | `10_*` TODO 1 |
| Advisors | `supabase db advisors --local --type all` findings are fixed in `supabase/migrations/0018_advisor_fixes.sql`. `auth_rls_initplan` (5): `(select auth.uid())` in `profiles_select_self_or_manager`, `lead_notes_insert`, `leads_select`, `leads_update` and the profiles update policy. `multiple_permissive_policies` (2): `profiles_update_self` and `profiles_update_admin` are merged into `profiles_update_self_or_admin`. `tape_presets_select_active` is now anon only, plus `tape_presets_select_authenticated` = `is_active or is_admin()`. Both give the same rows as before. `rls_enabled_no_policy` (2): an explicit RESTRICTIVE deny policy for anon and authenticated on `quote_tokens` and `rate_limits`. `unindexed_foreign_keys` (6): covering indexes. Only `unused_index` INFO remains. It comes from the statistics of a freshly reset local DB and needs no action. `supabase db lint --level warning` found nothing before or after. | pgTAP 11 updated to the merged policy name; full security suite |
| Scripts | `supabase/scripts/production-post-deploy.sql` is idempotent; run it once as `postgres`. It locks down `storage_vectors` with the same rule as 0014, and skips the database if it is missing or not owned by `postgres`. It gives the `\password electron_app` steps (no password in the file), re-asserts the pgaudit setting and runs the large-object purge. `supabase/scripts/verify-production.sql` runs in one read-only transaction and prints 23 PASS/FAIL checks, plus an INFO row that lists the installed extensions. The checks: RLS on every public table. Anon permissive policies only on the allow-list. No anon or authenticated grants on legacy tables. Anon EXECUTE only on `lead_transition_allowed`. A fixed `search_path` on SECURITY DEFINER functions and on all public functions. No PUBLIC EXECUTE on internal functions. Trigger functions not callable by API roles. For `electron_app`: attributes, membership, table allow-list, no TRUNCATE/REFERENCES/TRIGGER, no schema CREATE, no database CREATE or TEMP, connects only to `postgres`, no function EXECUTE, DDL guard enabled, pgaudit set. No login event triggers. Extension owners. `storage_vectors` locked down. No `electron_app` large objects. Local result after the post-deploy script ran: all PASS. | run by hand |
| npm audit | `npm audit fix` (non-breaking) changes nothing. `npm audit --omit=dev` finds 0 vulnerabilities. 16 moderate findings remain, all in dev-only lint tooling: `minimatch` < 11.0.1 (ReDoS) through `eslint` 9, `eslint-config-next`, `typescript-eslint` and `eslint-plugin-*`. The fix needs `eslint` 10 or `npm audit fix --force`, which are breaking. None of this code ships to the browser or server. | n/a |

### New finding: the hosted project runs Postgres 15 (deploy blocker, fixed)

`supabase link` wrote `supabase/.temp/postgres-version` = `15.14.1.054` on 2026-11-01. The CLI now starts the
local DB on the hosted project's version (PG 15.14), although `config.toml` says `major_version = 17`.
`0015_electron_role_large_objects.sql` used PG 16+ syntax (`grant ... with inherit true, set false`) and failed on
`db reset`. It would have failed on `supabase db push` too. Fixed: 0015 now checks `server_version_num` and
uses either the PG 16+ form or a plain `grant electron_app to postgres` (PG 15 memberships always inherit).
pgTAP 08, 09, 10 and 12 do the same for their `with set true` grants. On PG 15 the runner `postgres` can also
`SET ROLE electron_app`, because PG 15 has no per-grant SET option; `electron_app` still gains nothing. Owner
action: set `major_version` in `supabase/config.toml` to the hosted version (15), or upgrade the hosted project,
so that local tests match production.

### Gates (2026-11-01, local, PG 15.14 image)

- `npm run db:reset`: pass (0001 to 0018).
- `npm run db:test`: PASS, 12 files, 142 tests. TODO failures left: 3 for `storage_vectors` (08 tests 3, 5 and 6, which pass after `production-post-deploy.sql`), the L1 privileged path (08 test 15), L4 (09 test 7) and L5 (10 test 1). 08 test 4 passes unexpectedly on PG 15: `storage_vectors` has a NULL (default) ACL there, which test 4 does not expand; test 5 still catches it.
- `npm run typecheck` and `npm run lint`: pass. `npm run test`: 45 files, 318 tests pass. `npm run build`: pass.
- `SECURITY_BASE_URL=http://localhost:3000 npm run test:security` after `db:reset`: 45 files, 426 tests pass. No web code changed, so the existing `:3000` build was used.
- `supabase db lint --level warning`: no findings. `supabase db advisors --local`: only `unused_index` INFO.

## Round 2026-11-01b: workshop ("xưởng") role and production dashboard

Local stack only. No remote or production database was touched. New migrations:
`0020_workshop_role.sql` (enum value only, separate transaction) and `0021_production_jobs.sql`.

### Design (what is enforced where)

| Control | Enforcement | Test |
|---------|-------------|------|
| New role `workshop` (admin invites / activates / deactivates through the existing users page; `app_metadata.role`). `assign_lead` still refuses workshop users as sales assignees. | `app_role` enum, `handle_new_user` (0011, unchanged), `assign_lead` role list (0004, unchanged) | pgTAP 14 |
| Workshop sees ONLY jobs an admin assigned to it. `production_jobs` RLS: `is_admin() or (workshop_user_id = auth.uid() and is_workshop())`; `is_workshop()` requires an active profile, so unassign and deactivate both remove access, Realtime events and design files at once. | RLS on `production_jobs`, `production_step_log` (visible iff the job is), `storage.objects` policy `lead_files_select` (previews / logos only, never quotes) | pgTAP 14; `tests/security/workshop/visibility`, `revocation` |
| Workshop sees only production specs. No grant or policy on `leads`, `designs`, `quotes`, `quote_lines`, `lead_notes`, legacy tables. Specs come from SECURITY DEFINER `workshop_jobs()` (`search_path = ''`, fixed column list: size, colors, quantity, print text, design JSON, preview/logo paths, due date, production note, order/lead code, assignee name). `production_jobs` / `production_step_log` have no price or contact columns. | DB (RPC + RLS), not UI | pgTAP 14 (function result columns, table columns, 0 rows on every sales table, 42501 on `bang_keo_in_orders`); security suite checks keys AND values (phone, email, company, note, prices) in RPC output and in the rendered `/portal/xuong` pages |
| Writes only through SECURITY DEFINER RPCs. `authenticated` has SELECT only on the two tables (INSERT/UPDATE/DELETE/TRUNCATE revoked, anon has nothing). | grants | pgTAP 14, `workshop/steps` (direct PATCH/INSERT/DELETE refused for workshop and admin) |
| Hand-off `convert_lead_to_production(lead, due_date, note, workshop_user)`: admin / server code, or the workshop user assigned to that lead's job; only admin may pick the workshop user; due date required and `>= today` (Vietnam) for every caller; idempotent. Old one-argument signature dropped. | RPC | pgTAP 13 + 14; `workshop/convert` |
| Lead guards accept the production link from a non-admin only inside the hand-off: `is_job_handoff(old, new)` requires an empty old link, unchanged privileged columns, and a `production_jobs` row with that `order_id` converted by `auth.uid()` (written by the definer function in the same transaction). A direct `update leads set production_order_id` by staff still fails. | `leads_guard_columns`, `leads_guard_admin_columns` (0021) | pgTAP 07 (unchanged, passes), `workshop/convert` |
| Steps: workshop = own job, next step only, no `huy`; admin = any step + `huy`; every change logged (who, name snapshot, when, note). Sync forward-only to lead status (`production` / `shipping` / `done` / `cancelled`) with `lead_status_log.changed_by` = the actor, and to Electron `bang_keo_in_orders.da_giao`. | `advance_production_step`, internal `production_sync_lead` (EXECUTE revoked from API roles) | pgTAP 14, `workshop/steps` |
| VAT: `vat = quotes.vat_amount`, `vat_percent = quotes.vat_percent`, `thanh_tien_ban = quotes.subtotal`, `cong_no_khach = GREATEST(thanh_tien_ban + vat - tien_coc, 0)` = `orderMath.customerDebtSqlExpression('bang_keo_in_orders')` without axis = accepted quote total. | RPC | pgTAP 14, `workshop/convert` |
| Electron unaffected: no trigger and no column added to legacy tables in production (local stub only gets the missing `vat`, `vat_percent`, `tien_coc`, `cong_no_khach`, `da_giao`, `da_tat_toan` columns, guarded by information_schema). `electron_app` keeps DML on its 5 tables (incl. web-created rows) and has no access to the new tables. Desktop edits of `ngay_du_kien` / `da_giao` are read live by `workshop_jobs()`. | 0021 | pgTAP 14 (electron_app update/insert/delete, postgres write, no trigger on `bang_keo_in_orders`, 42501 on `production_jobs`) |

### Finding during this round (fixed before commit)

| # | Finding | Severity | Fix | Test |
|---|---------|----------|-----|------|
| P5 | First draft of `advance_production_step` checked access with `not (v_admin or v_job.workshop_user_id = auth.uid())`. For an unassigned job (`workshop_user_id` NULL) the expression is NULL, plpgsql treats `if NULL` as false, so ANY active workshop user could change the steps (and the lead status) of an unassigned job. Found by the security suite (revocation test). | High (pre-release) | `coalesce(v_job.workshop_user_id = auth.uid(), false)`. Other checks already used `is distinct from` or sit in WHERE/policies, where NULL excludes the row. | pgTAP 14 ("workshop cannot change a job that has no workshop user"), `workshop/revocation` |

### Open points for the owner

- Sync with Electron is one-way (web -> `da_giao`). Marking an order delivered in the desktop app does not move the
  web job; the dashboard shows "desktop delivered" instead. `huy` has no Electron counterpart: cancel or delete the
  order in the desktop app by hand. A reverse trigger on `bang_keo_in_orders` was not added on purpose (it would
  run on every Electron write as `electron_app`).
- Admin may move a job backwards; the lead status is never moved backwards (a `done` lead stays `done`).
- Managers have no access to the workshop board (not requested). Add `is_manager_or_admin()` to the policy and RPC if wanted.
- `verify-production.sql` locally: all PASS except the 3 known `storage_vectors` rows (fixed by `production-post-deploy.sql`).

### Gates (2026-11-01, local, PG 15.14 image)

- `npm run db:reset`: pass (0001 to 0021). `npm run db:test`: PASS, 14 files, 242 tests (new `14_workshop_production`: 91; 13 updated to the new signature). Same known TODOs as before.
- `npm run typecheck`, `npm run lint`: pass. `npm run test`: 47 files, 333 tests pass. `npm run build`: pass (new routes `/portal/xuong`, `/portal/xuong/[id]`).
- Server from the new build on `:3001` (`ALLOW_TEST_SECRETS=1`), `db:reset`, then `SECURITY_BASE_URL=http://localhost:3001 npm run test:security`: 50 files, 470 tests pass (new `tests/security/workshop/`: visibility, convert, steps, revocation, pages-actions).
