# features/portal-ui

**Owner:** portal foundation. Other features import only from `index.ts`.

Portal shell (`AppShell`, used by `app/(portal)/{admin,portal}/layout.tsx`), UI kit, and pure list helpers
(URL params <-> sort/filter/search/date/pagination, applied to Supabase through a typed whitelist).
Spec for page agents: [DESIGN.md](./DESIGN.md).

- `lib/` pure: `list-params`, `apply-query`, `apply-memory`, `workflow`, `status-tones`, `nav` (+ tests)
- `components/` kit (universal unless marked "use client")
- copy: `vi.portalUi`; tokens: `globals.css` section "Portal" (prefix `pt-`)
