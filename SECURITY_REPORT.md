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
11. CSP in a real browser: no violations on `/`, `/thiet-ke` (Konva + three.js + Turnstile iframe) and `/q/<token>`.
    Nonce-only `style-src` may block libraries that inject `<style>` tags or set the `style` attribute.
    Check routes skipped by the proxy matcher (paths ending in `.png`/`.svg`, which carry no CSP header).
12. CSRF: cross-origin `fetch`/form POST to every route handler and Server Action with the auth cookie (expect 403).
13. `/q/<token>`: brute force and enumeration timing, expired or revoked token, token for quote A used to
    answer quote B, replay after acceptance, rate limit per IP and per token.
14. Email (Resend): HTML injection through customer name, company or note in every template. Make sure
    customer input cannot change the recipient or headers.
15. Quote status (W7, migration 0012): as manager over PostgREST, `PATCH /quotes?id=eq.<sent>` with
    `status=draft` must return 42501. Edit lines, then set `sent` again: this must also fail. Admin can
    cancel an accepted quote, manager cannot. Run `supabase/tests/rls/06_quote_status_transitions.test.sql`.
16. Superseded versions (W6): send v1, create a new draft with "create" (not "new version"), send v2.
    The v1 link must now show "link expired", and `POST /api/q/<v1 token>/respond` must return 404.
17. Used links (W5): answer a quote, then move `quote_tokens.expires_at` into the past. `/q/<token>`
    must no longer show prices or names.
18. Body caps: `POST /api/q/<token>/respond` with a 1 MB chunked body and no Content-Length must
    return 413 quickly, and server memory must not grow. Also send a 6 MB+ multipart to `/api/leads`.
19. Turnstile hostname (W9): solve the widget on another origin that embeds our sitekey (localhost
    with a real key), then post that token to `/api/leads`. Expect `captcha`. Check that both www and
    apex hostnames still pass.
20. Production email without `RESEND_API_KEY` (W10): sending a quote must show "email failed". The
    quote must stay `draft`, no token may stay live, and logs must not contain recipient addresses.
21. Lead confirmation relay (W11): submit a lead with a third-party email and a name that contains
    `evil.vn` or `https://…`. The mail must greet "quý khách" and contain no link text. Also confirm
    the 5 per hour per IP limit and Turnstile stop bulk sending.
22. Realtime DELETE events: as a logged-in but inactive user (or staff on another lead), subscribe to
    `postgres_changes` on `leads`/`lead_notes`/`quotes`. An admin then deletes a row. Supabase does not
    apply RLS to DELETE events. Confirm that the payload carries only the primary key (`old.id`), with
    no name, phone or price.
23. Server Actions: replay each action ID (from the client bundle) as `POST /portal` with a staff
    cookie and another lead's UUID: `sendQuoteAction`, `saveQuoteDraftAction`, `createQuoteVersionAction`,
    `getQuotePdfUrlAction`, `assignLeadAction`, `updateUserAction`, `inviteUserAction`,
    `convertToProductionAction`, `changeStatusAction` and `addNoteAction`. Expect a forbidden message
    or an RLS empty result. Send a cross-origin `Origin` and expect Next.js to reject it.
24. Auth callback: `/auth/callback?type=recovery&token_hash=…&next=https://evil` must land on
    `/auth/update-password`. `next=//evil`, `/%5Cevil` and `/%252F%252Fevil` must fall back to `/portal`.
25. Admin invite: invite an existing confirmed email and expect "email exists" with no role change.
    As staff, `auth.updateUser({ data: { role: "admin" } })` (user_metadata) must not change
    `profiles.role` or RLS results, because only `app_metadata` is read.
