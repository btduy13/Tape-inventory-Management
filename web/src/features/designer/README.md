# features/designer

**Owner:** `designer` feature builder. Only this feature edits files in this folder.

2D tape designer (Konva): preset picker, up to 3 colors, text, logo upload UI, repeating pattern on tape strip, PNG export.

## Routes

- /design (page UI, together with lead-intake form)

## Data

- tape_presets (read)
- DesignJson in lib/types.ts (owner of its shape)

## Rules

- Expose `useDesignState()` + `<TapeCanvas2D>` that publishes an HTMLCanvasElement (or dataURL) for mockup3d.
- Client-side logo checks (type PNG/JPG/SVG, <=5MB) are UX only; server re-validates.
- Konva must be loaded client-only (`dynamic(() => import(...), { ssr: false })`).

## Layout

```
designer/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).
