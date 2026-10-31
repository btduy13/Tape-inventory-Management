# features/email

**Owner:** `email` feature builder. Only this feature edits files in this folder.

Email sending behind an interface (EmailSender) with Resend implementation and an in-memory fake for tests; Vietnamese templates.

## Routes

- none (library used by other features)

## Data

- profiles (recipients)
- env RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAILS

## Rules

- Templates: customer confirmation (with mockup image), admin new lead, staff assigned, quote sent, customer responded.
- Subjects come from i18n vi.email.*. Escape all user content in HTML.
- Factory picks fake sender when RESEND_API_KEY is missing (dev/tests).

## Layout

```
email/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).
