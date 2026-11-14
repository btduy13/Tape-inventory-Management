# Safe migration / backfill of legacy order data into new web modules (same Supabase Postgres DB)

Research method note: WebSearch/WebFetch tools failed in this session (model error), so sources were fetched directly with curl from primary docs: PostgreSQL 18 docs, Supabase docs, Martin Fowler, Stripe engineering blog, GitLab dev docs, Splink docs, and the PostgreSQL source tree. No secondary blog posts or 2021-2026 opinion pieces were read beyond these. Points not backed by a fetched source are marked as inferences.

## 1. Entity resolution / dedup of customers from free-text names without phones

### Takeaway
Postgres already ships everything needed for a few hundred rows: `unaccent` (its default rules map all Vietnamese letters including đ/Đ, ơ, ư and stacked tone marks) plus `pg_trgm` similarity. Normalize first (lowercase, unaccent, strip company prefixes/legal-form words, collapse spaces), then exact-match on the normalized key, then use trigram similarity only to *suggest* merges into a human review queue. With 0 phones, no auto-merge is safe; the owner's "review before create" requirement matches standard entity-resolution practice (clerical review).

### Cited Findings
- `unaccent` is a filtering text-search dictionary that "removes accents (diacritic signs)"; it exposes `unaccent([dictionary,] text)`; custom rules files can be configured via `ALTER TEXT SEARCH DICTIONARY unaccent (RULES='my_rules')`; rules files must be UTF-8 in `$SHAREDIR/tsearch_data/` — [PostgreSQL unaccent](https://www.postgresql.org/docs/current/unaccent.html)
- The standard `unaccent.rules` file contains Vietnamese mappings, verified by grep: `Đ→D`, `đ→d`, `Ơ→O`, `ơ→o`, `Ư→U`, `ư→u`, `Ạ→A`, `Ặ→A`, `Ễ→E`, `ữ→u`, `ỹ→y` (lines 95-96, 229-240, 823-912) — [postgres/contrib/unaccent/unaccent.rules](https://raw.githubusercontent.com/postgres/postgres/master/contrib/unaccent/unaccent.rules)
- `pg_trgm.similarity_threshold` (used by `%`) defaults to 0.3; `pg_trgm.word_similarity_threshold` (`<%`, `%>`) defaults to 0.6; `pg_trgm.strict_word_similarity_threshold` (`<<%`, `%>>`) defaults to 0.5 — [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- pg_trgm "ignores non-word characters (non-alphanumerics)" when extracting trigrams; each word gets two leading spaces and one trailing space; comparisons are case-insensitive in a default build — [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- `word_similarity` is better for matching a part of a string; `strict_word_similarity` matches whole words (example: `word_similarity('word','two words') = 0.8`, `strict_word_similarity = 0.571`) — [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- GIN (`gin_trgm_ops`) and GiST (`gist_trgm_ops`) indexes support `%`, LIKE/ILIKE and regex; GiST supports `<->` nearest-neighbour ordering, GIN does not — [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- fuzzystrmatch: "soundex, metaphone, dmetaphone, and dmetaphone_alt functions do not work well with multibyte encodings (such as UTF-8). Use daitch_mokotoff or levenshtein with such data." — [PostgreSQL fuzzystrmatch](https://www.postgresql.org/docs/current/fuzzystrmatch.html)
- Splink (UK MoJ entity-resolution library): run time is driven by "the number of record pairs" to compare, controlled by blocking rules — i.e. restrict candidate pairs before scoring — [Splink blocking rules](https://moj-analytical-services.github.io/splink/topic_guides/blocking/blocking_rules.html)
- Splink provides a "Clerical Labelling" workflow (human labels on candidate pairs used to evaluate/tune the model) — [Splink clerical labelling](https://moj-analytical-services.github.io/splink/topic_guides/evaluation/labelling.html)

### Inferences
- Recommended normalization pipeline (SQL, immutable wrapper so it can be used in a generated column/index):
  1. `lower()`, `unaccent()`, replace punctuation (`.`, `,`, `-`, `&`) with space, collapse whitespace, `trim`.
  2. Strip legal-form/prefix tokens *after* unaccent so one list covers all spellings: `cong ty`, `cty`, `ct`, `tnhh`, `mtv`, `1tv`, `co phan`, `cp`, `jsc`, `co ltd`, `ltd`, `tm`, `thuong mai`, `dv`, `dich vu`, `sx`, `san xuat`, `xnk`, `xuat nhap khau`, `doanh nghiep tu nhan`, `dntn`, `hkd`, `ho kinh doanh`, plus person honorifics `anh`, `chi`, `a.`, `c.`, `co`, `chu`, `ong`, `ba` when they are the first token. Keep the raw name too; store the key in `customers.name_key` / staging.
  3. Caveat: stripping words like "thuong mai/san xuat" can make two different companies collide (e.g. "Cty TNHH Minh Phát" vs "Cty CP Minh Phát" are different legal entities). Treat a match after stripping legal form as a *suggestion*, not auto-merge.
- `unaccent()` is not marked IMMUTABLE (it depends on the dictionary/search_path), so the common pattern is a wrapper `create function public.f_unaccent(text) returns text language sql immutable parallel safe set search_path = '' as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;` (on Supabase extensions live in schema `extensions`). This is widely used practice; I did not re-verify the volatility wording in the fetched page text — verify with `\df+ unaccent`.
- Matching tiers for the review queue (tune on the real 120 orders):
  - Tier A, exact `name_key` equal → group, propose 1 customer; bulk-approvable.
  - Tier B, `similarity(name_key_a, name_key_b) >= 0.6` (or `strict_word_similarity >= 0.5`) → "probably same", show side by side, default checked.
  - Tier C, 0.3–0.6 → "maybe", default unchecked.
  - Below 0.3 → separate customers.
  Thresholds above are starting points derived from the pg_trgm defaults, not validated values; with ~120 orders the owner can eyeball all of them in one sitting.
- Short Vietnamese names have few trigrams, so similarity is noisy ("Anh Hùng" vs "Anh Dũng"). Use address/district as a tie-breaker signal shown in the UI rather than a scoring input.
- Blocking at this scale is unnecessary (120 × 120 = 14,400 pairs is trivial); a self-join with `%` is fine. Add a GIN trgm index on `customers.name_key` only for the live "pick existing customer" search.
- Bulk-approve UX pattern: one card per proposed cluster → editable canonical name, list of member orders (date, total, address), checkbox per member to exclude, actions "Create customer", "Merge into existing…", "Skip/never ask". Pre-sort clusters by confidence (Tier A first) and offer "Approve all Tier A" with a count preview. Record every decision (who, when, action) so a re-run never re-asks.

### Gaps
- No authoritative published list of Vietnamese company-prefix stop words was found; the list above is domain knowledge and must be checked against the real data.
- No source found that validates specific pg_trgm thresholds for Vietnamese names.

## 2. Patterns: staging, dry-run, idempotency, batching, audit columns, rollback, verification

### Takeaway
For hundreds of rows, a single SQL function run in one short transaction is safe. The important parts are: write proposals to a staging/review table, make every step idempotent (`ON CONFLICT`, `WHERE customer_id IS NULL`), tag every created row with source/batch id so it can be deleted precisely, and compare counts/sums before and after. Batching and throttling (GitLab style) matter only at millions of rows.

### Cited Findings
- `INSERT ... ON CONFLICT DO NOTHING` skips conflicting rows; `ON CONFLICT DO UPDATE` "guarantees an atomic INSERT or UPDATE outcome ... even under high concurrency" — [PostgreSQL INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- GitLab requires batched background migrations to be idempotent so a retried job does not corrupt data; work is split into batches ("If the table has 1000 records and the batch size is 100, the work is batched into 10 jobs"); batch size is auto-tuned from "the performance of the last 20 jobs"; migrations are throttled/paused (10 minutes) on signals such as active autovacuum or WAL pressure — [GitLab batched background migrations](https://docs.gitlab.com/development/database/batched_background_migrations/)
- Stripe's online migration: create new table, dual-write new data, then "backfill missing data to the new store so the two stores hold identical information", then verify reads by comparing both paths (GitHub Scientist) before switching reads — [Stripe: Online migrations at scale](https://stripe.com/blog/online-migrations)
- Stripe found the most expensive part of a backfill is *finding* the objects to migrate, and offloaded that to an offline snapshot — [Stripe](https://stripe.com/blog/online-migrations)
- `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` is allowed for foreign-key, CHECK and not-null constraints; `VALIDATE CONSTRAINT` scans later — [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)

### Inferences
- Concrete pipeline for this project:
  1. Schema (migration file): `customers` table; `orders.customer_id uuid null references customers(id)` (add FK `NOT VALID` then `VALIDATE` — trivial at 120 rows but a good habit); audit columns on `customers`: `source text` (`'legacy_backfill' | 'web' | 'manual'`), `migration_batch uuid`, `created_by`, `created_at`; on orders: `customer_linked_at`, `customer_link_source`.
  2. Staging: `customer_backfill_candidates(id, batch_id, order_id, raw_name, raw_phone, raw_address, name_key, cluster_key, confidence, status pending|approved|rejected|skipped, decided_by, decided_at, target_customer_id)`. The existing dry-run (120 orders, 58 review items) already produces this shape.
  3. Dry-run function returns proposed actions only (no writes to real tables) — counts by tier, list of clusters.
  4. Apply function processes only `status='approved'` rows, inserts customers with `ON CONFLICT (name_key) DO NOTHING` (or a unique index on name_key where source='legacy_backfill'), updates `orders set customer_id = … where id = … and customer_id is null`. Re-running is a no-op.
  5. Verification queries (run before and after, store results): `count(*)` orders; `sum(total)` orders; `count(*) where customer_id is null`; per-customer `sum(order total)` equals sum of member orders; no order linked to two customers; every `legacy_backfill` customer has ≥1 order. Order totals must be byte-identical before/after since the backfill must never touch them.
  6. Rollback: `update orders set customer_id = null where customer_link_source='legacy_backfill' and <batch>`; `delete from customers where migration_batch = <batch> and not exists (newer orders linked)`. Keep this as a ready, tested SQL script.
- Batch size: 120 orders fit in one transaction lasting milliseconds; batching adds complexity with no benefit. Shortcut acceptable up to ~tens of thousands of rows; above that, loop in batches of ~1,000 with a commit per batch.

### Gaps
- No small-scale (hundreds of rows) case study was found; the large-company sources (Stripe, GitLab) are scaled down by inference.

## 3. Running the backfill on a live DB used concurrently by the desktop app

### Takeaway
UPDATE/INSERT take only ROW EXCLUSIVE table locks, which do not block other readers/writers; the real risks are DDL (ALTER TABLE, CREATE TRIGGER) waiting behind the Electron app's transactions, and long-open transactions. Set `lock_timeout` and `statement_timeout` for the session, keep the transaction short, and run DDL in a quiet window.

### Cited Findings
- UPDATE, DELETE, INSERT and MERGE acquire ROW EXCLUSIVE on the target table — "any command that modifies data" — [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- CREATE TRIGGER acquires SHARE ROW EXCLUSIVE; plain CREATE INDEX acquires SHARE; DROP TABLE, TRUNCATE and many ALTER TABLE forms take ACCESS EXCLUSIVE — [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- `lock_timeout` aborts any statement waiting longer than the limit to acquire a lock; default 0 (disabled); setting it ≥ `statement_timeout` is pointless — [PostgreSQL client config](https://www.postgresql.org/docs/current/runtime-config-client.html)
- `idle_in_transaction_session_timeout` terminates sessions idle inside an open transaction; an open transaction "prevents vacuuming away recently-dead tuples" and can bloat tables — [PostgreSQL client config](https://www.postgresql.org/docs/current/runtime-config-client.html)
- Adding a CHECK or NOT NULL constraint scans the table but does not rewrite it — [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)

### Inferences
- Script header: `set lock_timeout = '3s'; set statement_timeout = '30s';` then retry on failure. A DDL statement waiting for ACCESS EXCLUSIVE also blocks every later query on that table queue (well-known Postgres lock-queue behaviour; not quoted from a fetched source), so a short lock_timeout protects the Electron app.
- Only update rows where `customer_id is null` and select the target orders `for update skip locked` if the app could edit the same order mid-run (unlikely at this scale).
- Do not add triggers that rewrite the Electron app's free-text fields; the desktop app expects its columns unchanged.
- Order of operations: (1) backup, (2) DDL migration in quiet hour, (3) ship web code that tolerates `customer_id` null, (4) dry-run, (5) owner reviews, (6) apply, (7) verify, (8) only then make web UI depend on the link.

### Gaps
- Electron app's transaction length/connection pooling behaviour not checked in this research.

## 4. Keeping legacy app and web in sync afterwards

### Takeaway
Use Fowler's parallel change (expand / migrate / contract). The legacy app keeps writing free text, so the new `customer_id` is a nullable, additive column. New legacy orders land unlinked and enter the same review queue (periodic or trigger-fed), rather than a trigger auto-creating customers — which would violate the owner's "no auto-create" rule. Dual-write from the Electron app (customer picker) is the end state once shipped.

### Cited Findings
- Parallel change splits a breaking change into "expand, migrate, and contract": expand adds support for old and new, migrate moves clients, contract removes the old once all clients have moved; it allows releasing in any phase and lowers risk — [Martin Fowler: ParallelChange](https://martinfowler.com/bliki/ParallelChange.html)
- Stripe dual-wrote new records to old and new tables before backfill, ramping up gradually while watching metrics — [Stripe](https://stripe.com/blog/online-migrations)

### Inferences
- Options compared:
  - **Trigger auto-link** (AFTER INSERT on orders: if `name_key` exactly matches one approved customer, set `customer_id`; else insert a pending candidate row). Real-time, zero app change. Acceptable only for *exact* key matches to existing customers; anything else goes to the queue. Trigger must be SECURITY DEFINER-safe and must never raise (wrap in exception handler) so it cannot break the desktop app's inserts.
  - **Periodic sync** (pg_cron or an admin "Scan new orders" button calling the same dry-run function). Simplest and decoupled; slight delay. Fits a small team best.
  - **Dual-write** (Electron app picks customer → writes `customer_id` and the free-text copy). Best long-term; the repo's recent commit "Thank you tab, customer picker" (1.5.22) suggests this is already started. Older installed app versions will still write unlinked orders, so the queue is still needed.
- Keep free-text fields on orders as a historical snapshot (name/address as printed on that order) even after linking; do not overwrite from the customer record.
- "Contract" phase (dropping free text or making `customer_id` NOT NULL) should wait until all Electron installs are upgraded; it may never be needed.

### Gaps
- No source compared trigger vs cron for this exact small-scale case.

## 5. Should historical orders create "quote" / "lead" records?

### Takeaway
No. Quotes and leads are pre-sale artefacts with their own lifecycle; fabricating them from completed orders creates fake history and corrupts funnel metrics. Leave those tabs empty and let them fill from real web-form submissions and new quotes; if the owner wants context, show legacy orders through a read-only view or a "History" panel on the customer page.

### Cited Findings
- Supabase: on Postgres 15+, create views `with (security_invoker = true)` so they obey RLS of underlying tables; views bypass RLS by default otherwise — [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Inferences
- If a non-empty first impression matters, use an empty-state message ("Chưa có yêu cầu báo giá — dữ liệu sẽ xuất hiện khi khách gửi form") plus a link to customer order history, instead of synthetic rows.
- If the owner insists, import as clearly tagged `source='legacy_order'`, `status='won'`, excluded from conversion stats; reversible via the source tag. Not recommended.

### Gaps
- No external source specifically on CRM lead backfill from orders; this is a judgment call.

## 6. Supabase-specific tips

### Takeaway
Put schema (tables, columns, functions, RLS) in versioned migrations applied with `supabase db push`; keep the data backfill as an idempotent SECURITY DEFINER function (in a migration) triggered explicitly by an admin, or a one-off SQL script — never data mutations hidden in a schema migration that would re-run on every fresh environment. Take a manual logical dump right before applying, regardless of plan.

### Cited Findings
- Once using migrations, changes made directly in the remote DB via SQL editor/Table Editor bypass migration history and cause push to fail with sync errors; all remote schema changes should go through migration files; seed data belongs in `supabase/seed.sql` (local reset) — [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- Pro/Team/Enterprise get daily backups (7/14/up to 30 days); free-tier projects are advised to regularly export data themselves; you can generate a logical backup with the Supabase CLI or `pg_dump` — [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- PITR is an add-on for Pro+ giving restore with "up to seconds of granularity"; restoring "replaces the current database state" — any later changes are lost — [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- Prefer security invoker; with security definer you must set `search_path` (recommended `''`, fully qualify `public.table`); definer functions created by migrations are owned by `postgres`, bypass RLS, and are callable by any role including `anon` by default — [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- Secret/service-role key bypasses RLS only when the request carries no user access token; must stay server-side — [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Inferences
- For backfill RPCs: `security definer set search_path = ''`, first line checks the caller is admin (e.g. `if not public.is_admin(auth.uid()) then raise exception …`), then `revoke execute on function … from public, anon;` `grant execute … to authenticated;`.
- Restoring a whole-project backup/PITR would also roll back the Electron app's orders entered after the restore point, so rollback should rely on the batch-tagged reverse script, with the dump as last resort.
- Run `supabase db dump --data-only -f pre_backfill.sql` (or `pg_dump`) immediately before apply; keep the file off the repo (contains customer PII).

### Gaps
- Did not verify the project's current Supabase plan (affects PITR/daily backup availability).
