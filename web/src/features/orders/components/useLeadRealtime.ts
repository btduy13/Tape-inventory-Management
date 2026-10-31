"use client";
// Subscribes to postgres_changes (RLS-filtered by Supabase Realtime) and calls back per event.
// Also refreshes when the tab becomes visible again, so missed events (e.g. an unassignment,
// which RLS hides from the former assignee) are picked up.
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REALTIME_TABLES, leadFilter, type ChangePayload } from "../lib/realtime-events";

type Options = {
  /** Limit to one lead (detail page); omit for the list. */
  leadId?: string;
  onChange?: (payload: ChangePayload) => void;
  /** Debounce for router.refresh() after a burst of events. */
  refreshDelayMs?: number;
};

export function useLeadRealtime({ leadId, onChange, refreshDelayMs = 400 }: Options) {
  const router = useRouter();
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), refreshDelayMs);
    };

    let channel = supabase.channel(`orders:${leadId ?? "all"}`);
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(leadId ? { filter: leadFilter(table, leadId) } : {}) },
        (payload) => {
          onChangeRef.current?.({
            table: payload.table,
            eventType: payload.eventType,
            new: (payload.new as Record<string, unknown>) ?? null,
            old: (payload.old as Record<string, unknown>) ?? null,
          });
          scheduleRefresh();
        },
      );
    }
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [leadId, refreshDelayMs, router]);
}
