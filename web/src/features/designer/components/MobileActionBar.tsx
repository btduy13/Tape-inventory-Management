"use client";
// Phone/tablet bottom bar: jump to the 3D mockup or open the quote step.
// Anchors keep working without JS; the handlers add smooth (or reduced-motion) scrolling.
import type { MouseEvent } from "react";
import { getDictionary } from "@/i18n";
import { QUOTE_ANCHOR, VIEW3D_ANCHOR } from "./anchors";
import { btnPrimary, btnSecondary } from "./ui";

type Props = { onView3d: () => void; onQuote: () => void };

export function MobileActionBar({ onView3d, onQuote }: Props) {
  const t = getDictionary().designer;
  const run = (fn: () => void) => (e: MouseEvent) => {
    e.preventDefault();
    fn();
  };
  return (
    <nav
      aria-label={t.mobileBar}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.2)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex w-full max-w-xl gap-2">
        <a href={`#${VIEW3D_ANCHOR}`} onClick={run(onView3d)} className={`${btnSecondary} flex-1`}>
          {t.view3d}
        </a>
        <a href={`#${QUOTE_ANCHOR}`} onClick={run(onQuote)} className={`${btnPrimary} flex-[1.4]`}>
          {t.getQuote}
        </a>
      </div>
    </nav>
  );
}
