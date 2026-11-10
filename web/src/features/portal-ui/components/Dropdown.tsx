"use client";
// Menu under a top-bar button: native <details>, closed on outside click, Escape and navigation.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Props = { summary: React.ReactNode; summaryClass?: string; align?: "start" | "end"; children: React.ReactNode };

export function Dropdown({ summary, summaryClass = "", align = "start", children }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details ref={ref} className="relative">
      <summary className={`flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden ${summaryClass}`}>{summary}</summary>
      <div className={`absolute top-full z-40 mt-1 min-w-56 rounded-xl border border-pt-line bg-pt-surface p-2 shadow-lg ${align === "end" ? "right-0" : "left-0"}`}>
        {children}
      </div>
    </details>
  );
}
