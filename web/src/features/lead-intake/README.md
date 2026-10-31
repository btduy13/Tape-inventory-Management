# features/lead-intake

**Owner:** `lead-intake` feature builder. Only this feature edits files in this folder.

Public quote request: landing sections, form (name, phone, email, company, quantity, note) + design, Turnstile, per-IP rate limit, zod validation, server-side insert with service role, logo/preview upload, sanitize SVG.

## Routes

- / (landing sections)
- /thiet-ke (form part)
- POST /api/leads

## Data

- leads (insert, service role)
- designs (insert)
- storage logos/, previews/
- rate_limits via lib/security/rate-limit.ts

## Rules

- Call assertSameOrigin() + checkRateLimit(RATE_LIMITS.leadSubmit) + Turnstile verify BEFORE any DB write.
- Sanitize SVG with isomorphic-dompurify (USE_PROFILES svg, no scripts/foreignObject) before upload.
- Store hashIp() in leads.source_ip_hash, never the raw IP.
- Trigger emails through features/email (customer confirmation, admin new lead).

## Layout

```
lead-intake/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).

## Implementation map

- `landing/` Server Components for `/` (hero, presets showcase, CTA, how it works, contact `#lien-he`).
  Contact details come from optional env `CONTACT_PHONE`, `CONTACT_EMAIL`, `CONTACT_ADDRESS`, `CONTACT_HOURS`.
- `components/LeadForm.tsx` form (takes `getDesign`), `components/DesignLeadForm.tsx` = LeadForm wired to
  `useDesignExport()` from features/designer (render inside `<DesignProvider>`). Pass `turnstileSiteKey`
  and the CSP `nonce` (`x-nonce` header) from the page.
- `server/handle-lead-submit.ts` route logic with injected deps (`server/deps.ts` = production wiring):
  same-origin -> rate limit -> capped body read (10.25MB) -> honeypot -> Turnstile -> zod + design
  (designer's `designJsonSchema`) -> magic-byte check / SVG sanitize / 5MB -> lead insert ->
  uploads `logos|previews/<lead_id>/…` -> design insert (rollback on failure) -> emails (best-effort).
- Response contract: `lib/api-contract.ts` (`{ ok: true, code }` or `{ ok: false, error, fields? }`).
