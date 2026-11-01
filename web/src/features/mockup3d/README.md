# features/mockup3d

**Owner:** `mockup3d` feature builder. Only this feature edits files in this folder.

3D mockup (react-three-fiber/drei): three lazy views (tape roll, kraft carton sealed with one strip along the top seam folding over the short ends, paper cup with a tamper-seal strip: one continuous strip up the front wall, over the lid centre and down the back, built from the cup + lid lathe profile). Strips are ribbon meshes (lib/ribbon.ts) with UVs along the strip. Geometry is procedural (no model files); the camera is fitted to each object's bounding sphere (lib/camera.ts, lib/views.ts). Texture fed live from the designer canvas.

Props for layout: `className`, `aspect` (CSS aspect-ratio from `sm` up, or "fill" to fill a sized parent), `mobileAspect` (below `sm`), `showTitle`. Camera re-fits on every resize; DPR capped at 2; no wheel/pinch zoom and `touch-action: pan-y`, so vertical swipes / wheel scroll the page and horizontal drags rotate.

## Routes

- /thiet-ke (embedded component)

## Data

- none (pure client)

## Rules

- Input: a canvas/texture source from features/designer. No network calls.
- Do not use drei environment presets that fetch remote HDRs (CSP blocks them); use local lights.
- Load client-only via next/dynamic with ssr:false.

## Layout

```
mockup3d/
  components/   React components (client components marked 'use client')
  server/       server-only code: actions, queries, route handler logic ('server-only')
  lib/          pure helpers + zod schemas
  *.test.ts     unit tests next to the code
  index.ts      public exports for pages/other features
```

Keep files under ~250 lines. Shared code goes to `src/lib/` only (ask the foundation owner).
