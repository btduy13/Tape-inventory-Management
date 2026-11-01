"use client";
// Realtime: production_jobs / production_step_log postgres_changes (RLS-filtered, so a workshop
// user only gets events for its own jobs) -> debounced router.refresh(). Also refreshes when the
// tab becomes visible again, which picks up an unassignment (RLS hides that event).
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const WORKSHOP_REALTIME_TABLES = ["production_jobs", "production_step_log"] as const;

export function WorkshopLiveRefresher({ jobId, refreshDelayMs = 400 }: { jobId?: string; refreshDelayMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), refreshDelayMs);
    };
    let channel = supabase.channel(`workshop:${jobId ?? "all"}`);
    for (const table of WORKSHOP_REALTIME_TABLES) {
      const filter = jobId ? (table === "production_jobs" ? `id=eq.${jobId}` : `job_id=eq.${jobId}`) : undefined;
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, schedule);
    }
    channel.subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [jobId, refreshDelayMs, router]);
  return null;
}
