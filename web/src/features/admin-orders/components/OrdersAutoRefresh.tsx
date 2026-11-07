"use client";
// The order tables are written by the desktop app too and are not in the realtime publication, so
// the order pages poll: router.refresh() every 30 s while the tab is visible, and when the tab
// comes back (same visibility handling as WorkshopLiveRefresher).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const ORDERS_REFRESH_MS = 30_000;

export function OrdersAutoRefresh({ everyMs = ORDERS_REFRESH_MS }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, everyMs);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [everyMs, router]);
  return null;
}
