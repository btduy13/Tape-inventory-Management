# features/mockup3d

**Owner:** `mockup3d` feature builder. Only this feature edits files in this folder.

3D mockup (react-three-fiber/drei): three lazy views (tape roll, kraft carton sealed with one strip along the top seam folding over the short ends, paper cup with a tamper-seal strip: one continuous strip up the front wall, over the lid centre and down the back, built from the cup + lid lathe profile). Strips are ribbon meshes (lib/ribbon.ts) with UVs along the strip. Geometry is procedural (no model files); the camera is fitted to each object's bounding sphere (lib/camera.ts, lib/views.ts). Texture fed live from the designer canvas.

## True scale (one mm system, 1 scene unit = 100 mm)

- Roll: core 76 mm inner Ø (6 mm wall); outer Ø from the annulus area, pi (R^2 - r^2) = length x thickness (thickness from the design state, 45 mic default). 50 m x 45 mic ~ Ø103 mm, 635 m x 45 mic ~ Ø210 mm. Clamp Ø500 mm only guards bad input.
- Carton: standard 40 x 30 x 25 cm shipping box (`CARTON_MM`); strip = the selected tape width (12-80 mm).
- Cup: 500 ml milk-tea paper cup, top Ø90, bottom Ø60, height 150, domed lid 12 mm (`CUP_MM`). Seal strip = the real tape width up to 60 mm: where the strip ends on the wall the cup is only Ø68 mm, so wider tape cannot wrap it; 72/75/80 mm tape is shown 60 mm wide (print scaled, not stretched) and the caption says so.
- The caption under the viewer states the real sizes shown.

## Watermark + disclaimer

- `components/Watermark.tsx`: Vĩnh Thịnh logo (`/brand/vinh-thinh-logo.png`, text-only if missing) + "Vĩnh Thịnh", tiled diagonally over the whole viewer at ~18% opacity, `pointer-events: none`, so crops still carry it. Context menu on the viewer is blocked; the canvas has no `preserveDrawingBuffer`, so there is no clean export path. The component offers no export.
- Disclaimer `MOCKUP_DISCLAIMER` is drawn inside the bottom of the viewer from `sm` up (also over the WebGL fallback); below `sm` it sits under the canvas at 12px so it never covers the scene.

## Eyedropper ("Chọn màu")

- Opt-in via the `colorPicker` prop (the designer passes a `ColorPickerBridge`: colour facts + "Dùng cho chữ" / "Dùng cho nền băng keo"). Toggle sits under the zoom +/− buttons (`aria-pressed`); Esc or the toggle exits. While picking, OrbitControls is disabled, so the picking click / drag never rotates or zooms.
- Hits on printed meshes (`userData.tapePrint`: roll surface, carton / cup strips) sample the 2D source canvas at the hit UV with the same repeat / offset / wrap / flipY as the GPU (`lib/pick.ts uvToPixel`): the true design colour. Other hits (box, cup, background) read the lit render (`gl.render` + `gl.readPixels` in the same task), labelled "màu hiển thị (có ánh sáng)". Optional native `window.EyeDropper` ("Chọn màu trên màn hình").
- Loupe follows the pointer (CSSOM transform, SVG fill: CSP-safe); the panel below the viewer is an `aria-live` region.

Props for layout: `className`, `aspect` (one of `MockupAspect` "16 / 9" | "4 / 3" | "1 / 1" | "4 / 5" | "3 / 4" from `sm` up, mapped to fixed Tailwind classes so no inline style hits the CSP; or "fill" to fill a sized parent), `mobileAspect` (below `sm`, same values), `showTitle`. Camera re-fits on every resize; DPR capped at 2; no wheel/pinch zoom and `touch-action: pan-y`, so vertical swipes / wheel scroll the page and horizontal drags rotate.

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
