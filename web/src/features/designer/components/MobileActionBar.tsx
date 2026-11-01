"use client";
// Phone-only bottom bar: jump to the 3D mockup or the quote form (anchors on /thiet-ke).
import { getDictionary } from "@/i18n";

export function MobileActionBar() {
  const t = getDictionary().designer;
  const link = "flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold";
  return (
    <nav aria-label={t.mobileBar} className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-neutral-200 bg-white p-2 lg:hidden">
      <a href="#xem-3d" className={`${link} border border-amber-700 text-amber-800`}>{t.view3d}</a>
      <a href="#yeu-cau-bao-gia" className={`${link} bg-amber-700 text-white`}>{t.getQuote}</a>
    </nav>
  );
}
