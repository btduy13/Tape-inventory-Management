"use client";
// Scroll scrub driver for variant E: writes --e-p (0..1) on every [data-e-scrub] element through
// CSSOM (CSP-safe, same approach as LandingMotion's --lp-p). 0 = the element's top edge is entering
// at the bottom of the viewport, 1 = it has travelled up to about a third of the viewport height.
// Off for prefers-reduced-motion: the CSS then falls back to the final state.
import { useEffect } from "react";

export function ScrubMotion({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-e-scrub]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const top = el.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, (vh * 0.95 - top) / (vh * 0.6)));
        el.style.setProperty("--e-p", p.toFixed(3));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      els.forEach((el) => el.style.removeProperty("--e-p"));
    };
  }, [rootId]);
  return null;
}
