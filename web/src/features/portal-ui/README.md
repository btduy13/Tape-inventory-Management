# features/portal-ui

**Owner:** portal foundation. Other features import only from `index.ts`.

Portal shell (`AppShell`, used by `app/(portal)/{admin,portal}/layout.tsx`), UI kit, and pure list helpers
(URL params <-> sort/filter/search/date/pagination, applied to Supabase through a typed whitelist).
Spec for page agents: [DESIGN.md](./DESIGN.md). Demo: `/admin/_kit` (dev only).

- `lib/` pure: `list-params`, `apply-query`, `apply-memory`, `workflow`, `status-tones`, `nav` (+ tests)
- `components/` kit (universal unless marked "use client")
- `demo/` kit page content with fake rows (not used in production pages)
- copy: `vi.portalUi`; tokens: `globals.css` section "Portal" (prefix `pt-`)
