# features/mockup3d

**Owner:** `mockup3d` feature builder. Only this feature edits files in this folder.

3D mockup (react-three-fiber/drei): three lazy views (tape roll, carton sealed with the tape, bubble-tea cup with a tape sticker band). Geometry is procedural (no model files); the camera is fitted to each object's bounding sphere (lib/camera.ts, lib/views.ts). Texture fed live from the designer canvas.

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
