# features/quotes

**Owner:** `quotes` feature builder. Only this feature edits files in this folder.

Manual quotes: price lines editor (admin/manager), PDF (@react-pdf/renderer), send via email, customer page /q/<token> with Accept / Request changes.

## Routes

- /q/[token]
- POST /api/q/[token]/respond
- quote editor inside lead detail

## Data

- quotes, quote_lines, quote_tokens (service role only), storage quotes/

## Rules

- Token: randomToken() from lib/security/hash.ts; store sha256Hex(token) only; expiry QUOTE_TOKEN_TTL_DAYS.
- Customer actions: assertSameOrigin + checkRateLimit(RATE_LIMITS.quoteRespond); on accept set quote accepted + lead accepted (service role) and notify staff+admin.
- Never auto-price. Totals are recomputed in SQL from quote_lines.

## Layout

```
quotes/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).

Security rules (SECURITY_REPORT.md W5 to W8):

- Sending a quote cancels every other `sent` quote of the same lead and revokes its links. Only the
  newest version can be answered.
- An expired link is invalid even after it was used. No permanent read-only view.
- In SQL (0012) a quote never goes back to `draft`. To change prices, create version + 1.
- `/api/q/[token]/respond` reads at most 8 KB of the body (`readTextCapped`).
