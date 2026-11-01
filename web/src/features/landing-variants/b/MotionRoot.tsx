"use client";
// Page root for variant B. Marks itself data-motion (so CSS may hide not-yet-revealed
// elements) and sets data-in on [data-reveal] / [data-seal] once they enter the viewport.
// Reduced motion: does nothing, everything stays static and visible.
import { useEffect, useRef } from "react";

export function MotionRoot({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = root.querySelectorAll("[data-reveal], [data-seal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    );
    root.setAttribute("data-motion", "");
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
