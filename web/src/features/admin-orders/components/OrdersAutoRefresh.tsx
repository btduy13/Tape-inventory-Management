"use client";
// The order tables are written by the desktop app too and are not in the realtime publication, so
// the order pages poll every 60 s, only while the tab is visible, plus once when it comes back
// (one visibilitychange listener; no focus listener, which fired a second refresh). Default action:
// router.refresh(); the list passes onTick to reload just its rows (KPIs are not polled).
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export const ORDERS_REFRESH_MS = 60_000;

export function OrdersAutoRefresh({ everyMs = ORDERS_REFRESH_MS, onTick }: { everyMs?: number; onTick?: () => void }) {
  const router = useRouter();
  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (tickRef.current) tickRef.current();
      else router.refresh();
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
