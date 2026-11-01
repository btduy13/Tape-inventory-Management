"use client";
// Brand watermark over the 3D viewer: the Vĩnh Thịnh logo + name, tiled diagonally across the
// whole canvas so a cropped screenshot still carries it. Dense brick tiling (every other row
// shifted by half a tile) keeps a mark in every ~200x200 px region, including the centre where the
// product renders. Purely decorative (aria-hidden), never intercepts pointer input (orbit keeps
// working). Static: no animation.
import { useState } from "react";

/** Brand asset published by the brand work (public/brand). Text-only if it cannot load. */
export const WATERMARK_LOGO_SRC = "/brand/vinh-thinh-logo.png";
export const WATERMARK_TEXT = "Vĩnh Thịnh";
// Rows x tiles over a 2x oversized, rotated layer: 150 px tiles, 96 px rows (covers ~2900 x 2300 px).
const ROWS = 24;
const PER_ROW = 20;

export function Watermark() {
  const [logoOk, setLogoOk] = useState(true);
  return (
    <div aria-hidden="true" data-watermark="vinh-thinh" className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] flex-col items-center opacity-[0.18]">
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} className="flex h-24 shrink-0 items-center even:translate-x-[75px]">
            {Array.from({ length: PER_ROW }, (_, i) => (
              <span key={i} className="flex w-[150px] shrink-0 items-center justify-center gap-1 text-xs font-bold tracking-wide whitespace-nowrap text-slate-900">
                {logoOk && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={WATERMARK_LOGO_SRC} alt="" draggable={false} className="h-7 w-auto" onError={() => setLogoOk(false)} />
                )}
                {WATERMARK_TEXT}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
