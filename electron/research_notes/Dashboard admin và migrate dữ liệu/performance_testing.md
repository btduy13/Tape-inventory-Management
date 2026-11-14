# Performance testing and speed-up plan: Next.js 16 admin on Vercel + Supabase Postgres

Research date: 2026-11-09. Note: WebSearch/WebFetch tools failed in this session; sources were fetched directly (curl) from official docs. All URLs below were read.

Project facts observed in this repo (web/), relevant to the findings:
- `web/next.config.ts`: `cacheComponents` intentionally OFF because the nonce CSP needs per-request rendering. No `vercel.json` in the repo, so the function region is whatever the Vercel dashboard says (default for new projects is `iad1`).
- `web/src/lib/supabase/proxy.ts:43` calls `supabase.auth.getUser()` on every matched request, and `web/src/lib/supabase/server.ts:42` (`getCurrentProfile`, wrapped in React `cache()`) calls `getUser()` again plus a profile read. `web/src/features/auth/server/session.ts:7` also calls `getUser()`. So each page navigation does at least 2 Auth-server round trips before the page's own RPC.
- `OrdersAutoRefresh.tsx` uses `setInterval` + `router.refresh()`; `useLeadRealtime.ts` / `WorkshopLiveRefresher.tsx` do debounced `router.refresh()` on realtime events. Each refresh is a full server re-render of the route.

## What to measure and with which tools

### Takeaway
Split latency into: network user→Vercel, Vercel function → Supabase round trips (count x RTT), DB execution time, and client JS/hydration. Use field data (Speed Insights) for TTFB/LCP/INP/CLS, Vercel Observability + `vercel httpstat` for server time, and Supabase Query Performance / `pg_stat_statements` / `EXPLAIN ANALYZE` for DB time.

### Cited Findings
- Thresholds (p75): LCP good <= 2.5 s — [web.dev LCP](https://web.dev/articles/lcp); INP good <= 200 ms, poor > 500 ms, measured at p75 segmented by mobile and desktop — [web.dev INP](https://web.dev/articles/inp); TTFB good <= 0.8 s, poor > 1.8 s (TTFB is not a Core Web Vital but precedes FCP/LCP) — [web.dev TTFB](https://web.dev/articles/ttfb).
- LCP in the field includes redirect time, connection setup and TTFB, so field and lab values differ — [web.dev LCP](https://web.dev/articles/lcp).
- Vercel Speed Insights is available on all plans and reports Core Web Vitals from real visitors — [Vercel Speed Insights](https://vercel.com/docs/speed-insights).
- Vercel "debug slow functions" workflow: Observability > Vercel Functions tab sorted by duration; `vercel httpstat /path` breaks a request into DNS, TCP, TLS, server processing and transfer ("server processing" = time in your function); `vercel inspect <url> --json` shows `deployedTo` (regions), `memorySize`, `timeout`; call httpstat 3x to separate cold vs warm — [Vercel: Debugging slow functions](https://vercel.com/docs/functions/debug-slow-functions).
- Observability shows function startup time, cold-start percentage, and latency to external APIs; "Slow responses often come from the work a function does rather than how it starts" — [Vercel KB: cold start performance](https://vercel.com/kb/guide/improve-function-cold-start-performance-on-vercel).
- Next.js `instrumentation.ts` exporting `register()` with `registerOTel('next-app')` from `@vercel/otel` enables OpenTelemetry tracing of server rendering/fetches — [Next.js Instrumentation](https://nextjs.org/docs/app/guides/instrumentation).
- Supabase CLI `supabase inspect db ...` commands (with `supabase link` + `--remote`): `cache-hit`, `unused-indexes`, `index-usage`, `seq-scans`, plus outliers/calls that need `pg_stat_statements` — [Supabase: Debugging and monitoring](https://supabase.com/docs/guides/database/inspect).
- `index_advisor` extension: available in Studio via Query Performance Report > select query > "indexes" tab, or `select * from index_advisor('select ... where title = $1')`; supports `$1` params — [Supabase index_advisor](https://supabase.com/docs/guides/database/extensions/index_advisor).
- Measuring RLS cost: `set session role authenticated; set request.jwt.claims to '{"role":"authenticated","sub":"<uuid>"}'; explain analyze ...; set session role postgres;`. PostgREST `.explain({ analyze: true })` works after `alter role authenticator set pgrst.db_plan_enabled to true` (docs say not for production) — [Supabase RLS performance KB](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv).

### Inferences
- Practical order: (1) `vercel inspect --json` to read the actual region; (2) `vercel httpstat` on a list page 3x; (3) Observability external-API latency; (4) add `console.time`/OTel spans around `getUser`, profile read, list RPC; (5) `EXPLAIN ANALYZE` the RPC as `authenticated`. That isolates region vs auth vs DB vs client in under an hour.
- For a SECURITY DEFINER RPC, RLS of the tables it reads is bypassed (definer owner), so RLS cost matters for direct table reads and helper functions, less for the RPC body.

### Gaps
- Did not verify current Vercel Observability plan limits (some Observability Plus features are paid).
- No source fetched for Chrome DevTools Performance panel / WebPageTest specifics; standard usage assumed known.

## Testing authenticated pages realistically and budgets

### Takeaway
Use Playwright setup project + `storageState` to log in once, then time navigations on desktop and an emulated phone; run a k6 smoke test with 2-5 VUs for 1 minute. Budgets for an internal admin: TTFB p75 <= 800 ms, LCP <= 2.5 s, INP <= 200 ms, list RPC execution < 50-100 ms.

### Cited Findings
- Playwright auth pattern: a `setup` project logs in, saves `page.context().storageState({ path: authFile })`, other projects declare `dependencies: ['setup']` and `use.storageState` so tests start authenticated — [Playwright Authentication](https://playwright.dev/docs/auth).
- k6 smoke test: minimal load to verify behaviour and gather baselines; 2-20 VUs, 30 s to 3 min; example `vus: 3` ("keep it at 2, 3, max 5 VUs"), `duration: '1m'`; more than 5 VUs is already a mini load test — [k6 Smoke testing](https://grafana.com/docs/k6/latest/testing-guides/test-types/smoke-testing/).
- Thresholds are defined at p75 of page loads, segmented mobile vs desktop — [web.dev INP](https://web.dev/articles/inp).

### Inferences
- In Playwright, measure: `page.goto` to `domcontentloaded`, time from click on a sidebar `<Link>` to first table row visible, time from filter change to updated rows, and `performance.getEntriesByType('navigation')[0].responseStart` (TTFB). Use `test.use({ ...devices['Pixel 7'] })` plus CDP network throttling for the phone case. Record traces (`trace: 'on'`) for the slow steps.
- Run the Playwright/k6 test from a machine in Vietnam (staff location) and also from a Singapore VPS, to separate last-mile from origin latency.
- Load-testing etiquette: use a dedicated test staff account, read-only pages only (no server actions that write), off-peak (Vietnam night), 2-5 VUs for 1-3 min, tell the owner beforehand, watch Supabase CPU/connections and Vercel usage during the run. Prefer a Vercel preview deployment pointing at the same DB for A/B tests of fixes.
- Suggested budgets (inference, internal app, few users): server render of list page <= 300-400 ms warm when co-located; client navigation (Link click to rows) <= 500 ms; filter/sort update <= 300 ms; INP <= 200 ms on a mid-range phone.

### Gaps
- No published official "admin app" budget exists; budgets above are inferred from web.dev thresholds.
- Did not check whether the existing `web/e2e` Playwright setup already has an auth setup project.

## Biggest common causes of slowness (App Router + Supabase)

### Takeaway
The dominant suspect is region mismatch multiplied by sequential round trips: Vercel default `iad1` vs Supabase Singapore is ~207 ms RTT per call, and this app does >= 3 sequential Supabase calls per render (proxy `getUser`, page `getUser` + profile, list RPC), plus polling-driven full re-renders.

### Cited Findings
- Vercel Functions run in `iad1` (Washington, D.C.) by default for all new projects; Vercel advises running functions close to the data source — [Vercel: Configuring regions](https://vercel.com/docs/functions/configuring-functions/region).
- Measured ping Singapore -> Washington: ~207-213 ms average (wondernetwork, 2026-11-09) — [WonderNetwork pings](https://wondernetwork.com/pings/Singapore/Washington). Ho Chi Minh City -> Singapore ~27 ms; Hanoi -> Singapore ~57 ms — [WonderNetwork HCMC](https://wondernetwork.com/pings/Ho%20Chi%20Minh%20City/Singapore), [WonderNetwork Hanoi](https://wondernetwork.com/pings/Hanoi/Singapore).
- Vercel region `sin1` = AWS `ap-southeast-1` Singapore; `hkg1` = `ap-east-1` Hong Kong — [Vercel Regions](https://vercel.com/docs/regions). Supabase general APAC region is Southeast Asia (Singapore) — [Supabase Regions](https://supabase.com/docs/guides/platform/regions).
- `getUser()` always sends a request to the Auth server; `getClaims()` verifies the JWT locally against cached JWKS when the project uses asymmetric signing keys (default for new projects), otherwise it also calls the Auth server — [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims); current Next.js SSR guide uses `getClaims()` in the proxy and says to never trust `getSession()` on the server — [Supabase Next.js SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs).
- Nonce CSP: "you must use dynamic rendering to add nonces" (nonce generated per request in Proxy) — [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy).
- Sequential `await`s inside one component create waterfalls; start requests together and `Promise.all` them — [Next.js Fetching data](https://nextjs.org/docs/app/getting-started/fetching-data).
- Link prefetch default (`"auto"`): for dynamic routes only the partial route down to the nearest `loading.js` is prefetched; prefetch only runs in production — [Next.js Link](https://nextjs.org/docs/app/api-reference/components/link). Without `loading.js`, a dynamic navigation blocks until the server responds ("useLinkStatus is useful when ... the destination route is dynamic and doesn't include a loading.js") — [Next.js useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status).
- RLS: queries with limit/offset usually still evaluate all rows to determine order, so RLS cost hits paginated lists; benchmarks on 100K rows: unindexed `auth.uid()=user_id` 171 ms vs <0.1 ms indexed; `is_admin()` per row 11,000 ms vs 7 ms with `(select is_admin())`; `has_role()` 178,000 ms vs 12 ms — [Supabase RLS performance KB](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv).
- Cold starts: functions archive after 2 weeks idle in production (48 h preview), adding >= 1 s on next call; projects created before 2025-04-23 do not use Fluid compute automatically; large dependencies lengthen startup — [Vercel KB: cold starts](https://vercel.com/kb/guide/improve-function-cold-start-performance-on-vercel).

### Inferences
- Rough budget if Vercel is `iad1` and Supabase is Singapore: proxy `getUser` (1 RTT + TLS reuse) + page `getUser` (1 RTT) + profile (1 RTT) + RPC (1 RTT) ~= 4 x 207 ms ~= 0.85 s of pure network, before DB work; plus user (Vietnam) -> iad1 ~230+ ms RTT for the HTML and RSC payloads. This matches "slow" in production even though local renders in 0.9 s (local also pays VN->Singapore RTTs for each call).
- Polling `router.refresh()` re-runs the whole route server render (including all auth calls) each tick; on phones this also causes re-render jank, consistent with "not smooth".
- Locally 0.9 s already suggests several sequential calls; measure the split before optimizing.

### Gaps
- Actual Vercel region and Supabase region of this project not verified (need `vercel inspect --json` and Supabase dashboard).
- Did not measure client bundle size or check for heavy client components (charts, Excel libs) on list pages.

## Fixes, ranked by likely impact

### Takeaway
1) Move Vercel functions to `sin1` (same AWS region as Supabase Singapore). 2) Cut auth round trips: `getClaims()` (asymmetric keys) in proxy and pages, one call per request. 3) Add `loading.tsx`/Suspense per list route so Link clicks are instant, and parallelize fetches. 4) Index + RLS hygiene for the list RPC. 5) Replace polling with targeted refresh. Caching with `use cache` is limited by the nonce CSP.

### Cited Findings
- Set region in Dashboard (Settings > Functions > Function Regions) or `vercel.json` `{"regions": ["sin1"]}` or `vercel --regions sin1`; Hobby = single region; Pro = up to 5 — [Vercel: Configuring regions](https://vercel.com/docs/functions/configuring-functions/region).
- Routing Middleware (Proxy) is deployed to all regions regardless of region settings — [Vercel: Configuring regions](https://vercel.com/docs/functions/configuring-functions/region). (Implication: proxy's `getUser` runs near the user's edge, then the function runs in its region.)
- `getClaims()` preferred over `getUser()`; local verification only with asymmetric JWT signing key — [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims).
- `loading.js` gives an instant, prefetched fallback; navigation is interruptible and shared layouts stay interactive — [Next.js loading.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading).
- `useLinkStatus` for inline pending feedback on links when navigation is blocked — [Next.js useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status).
- Cache Components: `cacheComponents: true` (+ `partialPrefetching`), `'use cache'` + `cacheLife()` at data or component level; arguments become cache keys — [Next.js Caching (Cache Components)](https://nextjs.org/docs/app/getting-started/cache-components). `'use cache: private'` allows `cookies()`/`headers()` but in production is not stored in a server cache across requests (only per-request reuse and client router cache) — [Next.js use cache: private](https://nextjs.org/docs/app/api-reference/directives/use-cache-private).
- CSP nonce requires dynamic rendering; pages may need `await connection()` — [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy).
- RLS tips: index columns used in policies; wrap `auth.uid()`, `auth.jwt()` and security definer helpers in `(select ...)` (initPlan caches the value); add explicit filters (`.eq('user_id', id)`) instead of relying on RLS; use security definer helpers to avoid nested RLS on join tables; write `team_id in (select team_id from team_user where user_id = (select auth.uid()))` rather than per-row joins; add `TO authenticated` — [Supabase RLS performance KB](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv).
- Index WHERE, JOIN and ORDER BY columns of common queries; use `index_advisor` — [Supabase Query optimization](https://supabase.com/docs/guides/database/query-optimization), [index_advisor](https://supabase.com/docs/guides/database/extensions/index_advisor).
- Enable Fluid compute on older projects; trim heavy dependencies (bundle analyzer) to cut startup — [Vercel KB: cold starts](https://vercel.com/kb/guide/improve-function-cold-start-performance-on-vercel), [Next.js package bundling](https://nextjs.org/docs/app/guides/package-bundling).

### Inferences
- Region move is a config change with no code risk; expected saving ~200 ms per sequential Supabase call. Do it first and re-measure. Keep Supabase where it is (Singapore is ~27-57 ms from Vietnam).
- Auth: in `proxy.ts` switch `getUser()` to `getClaims()` (check the project uses asymmetric JWT signing keys in Supabase Auth settings; migrate if still on the legacy HS256 secret). In `getCurrentProfile`, use claims `sub` and fetch the profile; it is already deduplicated with React `cache()`. Keep `getUser()` only where a revoked session must be detected (e.g. sensitive admin actions). Security trade-off: `getClaims()` trusts a signed JWT until expiry, so a deleted/banned user keeps access up to the JWT lifetime.
- Run the profile read and the list RPC in parallel (`Promise.all`) where the RPC does not need profile output; or have the RPC derive the user from `auth.uid()` itself.
- Add `loading.tsx` with a table skeleton in each admin list segment; wrap KPIs/totals in their own `<Suspense>` so the rows stream first. Combined with default Link prefetch this makes sidebar clicks feel instant.
- Filters/sort/pagination: keep them in URL search params but update via `router.replace` inside `startTransition`, show pending state (`useTransition`/`useLinkStatus`), debounce text search ~300 ms. If totals are expensive, compute them in a separate call or use an estimate.
- For polling: lengthen intervals, pause when `document.hidden`, and refresh only the rows (the code comment says list passes `onTick` to reload rows; verify that path avoids `router.refresh()`). Prefer realtime events (already used) over timers.
- `use cache` is mostly not applicable for per-user admin data under nonce CSP; candidates are shared, slow-changing reference data (product catalogue, settings) cached with `cacheLife` + `revalidateTag` on mutation. Treat as optional, after region/auth fixes. Alternative: drop the nonce CSP in favor of a hash/static CSP only if security review accepts it (not recommended without that review).
- Supabase connection pooling: supabase-js goes through PostgREST over HTTPS, so Postgres pooling (Supavisor) is only relevant if the app opens direct Postgres connections (e.g. a Node `pg` client). Reuse of HTTPS keep-alive within a Fluid compute instance helps.
- Optimistic UI (`useOptimistic`) for status toggles and row edits removes the server round trip from perceived latency on phones.

### Gaps
- No source fetched on `useOptimistic` / server action concurrency details (Next.js updating-data page did not yield matches).
- Supabase Supavisor/connection-pooling docs not read in detail; statement about PostgREST being HTTP-based is general knowledge, not cited.
- No measured before/after numbers for Vercel region change in a VN/SG setup; savings are estimated from ping data.
