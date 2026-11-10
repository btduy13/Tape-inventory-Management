"use client";
// The order tables are written by the desktop app too and are not in the realtime publication, so
// the order pages poll every 60 s, only while the tab is visible, plus once when it comes back
// (one visibilitychange listener; no focus listener, which fired a second refresh). Default action:
// router.refresh(); the list passes onTick to reload just its rows (KPIs are not polled).
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export const ORDERS_REFRESH_MS = 60_000;

export function OrdersAutoRefresh({ everyMs = ORDERS_REFRESH_MS, onTick }: { everyMs?: number; onTick?: () => void | Promise<unknown> }) {
  const router = useRouter();
  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    // Never stack: skip while an onTick poll is in flight, and when the last tick was under half
    // a period ago (tab shown right before / after an interval tick).
    let busy = false;
    let last = 0;
    const tick = () => {
      if (document.visibilityState !== "visible" || busy || Date.now() - last < everyMs / 2) return;
      last = Date.now();
      if (!tickRef.current) return router.refresh();
      busy = true;
      void Promise.resolve(tickRef.current()).finally(() => {
        busy = false;
      });
    };
    const timer = setInterval(tick, everyMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [everyMs, router]);
  return null;
}
