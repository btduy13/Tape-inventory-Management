"use client";
// Loads the print font for canvas use. Canvas text (Konva stage, thumbnails) does not reflow when a
// web font arrives, so callers add the returned counter to their layout / draw dependencies.
import { useEffect, useState } from "react";
import { fontShorthand } from "../lib/fonts";

/** Vietnamese sample so the font's Vietnamese subset is fetched too. */
const SAMPLE = "Băng keo ĐƯỜNG Ấn Ợ";

/** Bumps once the font `id` is ready (0 before; stays 0 where the Font Loading API is missing). */
export function useFontReady(id: string): number {
  const [ready, setReady] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts?.load) return;
    let cancelled = false;
    document.fonts
      .load(fontShorthand(id, 40), SAMPLE)
      .then(() => {
        if (!cancelled) setReady((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);
  return ready;
}
