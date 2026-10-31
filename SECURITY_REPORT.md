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

## Needs live verification with Docker (later pentest)

1. `supabase db reset` applies 0001 to 0011 cleanly, and `npm run db:test` passes all 5 pgTAP files.
   File 05 has 24 assertions and has not been executed yet.
2. Under the CLI version in use, `session_user` for migrations and seed is `postgres` or a member of it,
   so `is_service_call()` still treats seed/migration updates as server code. If the CLI logs in as
   another role, the seed's `update leads set assigned_to` fails.
3. Connect as `electron_app` and confirm `select public.is_service_call()` returns false, no access to
   `leads`/`quotes`/`profiles`, and EXECUTE denied on `convert_lead_to_production`, `assign_lead` and
   `check_rate_limit`.
4. Trigger functions still fire after `REVOKE EXECUTE` (expected: EXECUTE is checked only at CREATE TRIGGER).
5. Realtime: staff stop receiving `leads`/`lead_status_log` events right after they are unassigned **and**
   right after they are deactivated. DELETE events do not leak old rows (replica identity full + RLS).
6. PostgREST as staff: `PATCH /leads?id=eq.<other>`, `PATCH /quotes`, `POST /quote_lines`, `GET /quote_tokens`,
   `POST /rpc/quotes_recalc_totals`, `POST /rpc/check_rate_limit`, `POST /rpc/next_bang_keo_in_order_id`.
   All must be denied or return empty.
7. Storage as staff: list and download objects of unassigned leads in logos/previews/quotes (expect deny),
   upload (expect deny), path tricks (`../`, a non-uuid prefix, URL-encoded slashes).
8. A sanitized SVG served from the Storage origin (signed URL) runs no script when opened directly.
   Confirm the stored `Content-Type` and consider `Content-Disposition: attachment` for SVG downloads.
9. Hosted project auth settings: sign-up disabled, email confirmations on, redirect allow-list limited to
   the production domain plus `/auth/callback`, JWT expiry, leaked-password protection.
10. On Vercel: confirm that `x-real-ip` / `x-vercel-forwarded-for` cannot be overridden by the client, so the
    rate limit holds against spoofed `X-Forwarded-For` and per-/64 IPv6 rotation. Confirm that Turnstile
    `siteverify` rejects reused tokens and wrong hostnames.
11. CSP in a real browser: no violations on `/`, `/design` (Konva + three.js + Turnstile iframe) and `/q/<token>`.
    Nonce-only `style-src` may block libraries that inject `<style>` tags or set the `style` attribute.
    Check routes skipped by the proxy matcher (paths ending in `.png`/`.svg`, which carry no CSP header).
12. CSRF: cross-origin `fetch`/form POST to every route handler and Server Action with the auth cookie (expect 403).
13. `/q/<token>`: brute force and enumeration timing, expired or revoked token, token for quote A used to
    answer quote B, replay after acceptance, rate limit per IP and per token.
14. Email (Resend): HTML injection through customer name, company or note in every template. Make sure
    customer input cannot change the recipient or headers.
