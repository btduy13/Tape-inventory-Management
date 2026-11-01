"use client";
// Tiny motion driver for the landing page (no dependencies):
// - marks the landing root with .lp-js so CSS may hide not-yet-revealed elements,
// - IntersectionObserver sets data-in on [data-lp-reveal] once they enter the viewport,
// - writes scroll progress (0..1) of [data-lp-progress] into --lp-p via CSSOM (CSP-safe:
//   CSSOM writes are not inline style attributes),
// - pauses SMIL (hero print) for prefers-reduced-motion and while off screen.
import { useEffect } from "react";

export function LandingMotion({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || typeof IntersectionObserver === "undefined") return;
    const svgs = Array.from(root.querySelectorAll<SVGSVGElement>("svg[data-lp-smil]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svgs.forEach((s) => s.pauseAnimations?.());
      return;
    }
    root.classList.add("lp-js");

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            reveal.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    root.querySelectorAll("[data-lp-reveal]").forEach((el) => reveal.observe(el));

    const smil = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const svg = e.target as SVGSVGElement;
        if (e.isIntersecting) svg.unpauseAnimations?.();
        else svg.pauseAnimations?.();
      }
    });
    svgs.forEach((s) => smil.observe(s));

    const tracks = Array.from(root.querySelectorAll<HTMLElement>("[data-lp-progress]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of tracks) {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / Math.max(1, r.height)));
        el.style.setProperty("--lp-p", p.toFixed(3));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      reveal.disconnect();
      smil.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove("lp-js");
    };
  }, [rootId]);
  return null;
}
