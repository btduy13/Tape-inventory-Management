// "Tự động cập nhật" marker next to the page title (WorkshopLiveRefresher does the work).
import { wsCopy } from "../lib/copy";

export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-pt-green-tint px-2.5 py-0.5 text-xs font-semibold text-pt-green-ink">
      <span aria-hidden className="size-2 rounded-full bg-pt-green-ink motion-safe:animate-pulse" />
      {wsCopy.live}
    </span>
  );
}
