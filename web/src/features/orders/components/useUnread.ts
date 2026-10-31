"use client";
// Per-viewer unread state in localStorage (wrapped in try/catch: storage may be unavailable).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BASELINE_STORAGE_KEY,
  SEEN_STORAGE_KEY,
  countUnread,
  isUnread,
  markSeen,
  parseBaseline,
  parseSeen,
  type SeenMap,
  type UnreadLead,
} from "../lib/unread";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore: unread badge is a convenience only */
  }
}

export function useUnread(leads: readonly UnreadLead[]) {
  // Until storage is read, treat everything as seen (no flash of badges during hydration).
  const [state, setState] = useState<{ seen: SeenMap; baseline: string } | null>(null);
  const [live, setLive] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const now = new Date().toISOString();
    const baseline = parseBaseline(read(BASELINE_STORAGE_KEY), now);
    if (baseline === now) write(BASELINE_STORAGE_KEY, now);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
    setState({ seen: parseSeen(read(SEEN_STORAGE_KEY)), baseline });
  }, []);

  const markLive = useCallback((leadId: string) => {
    setLive((prev) => (prev.has(leadId) ? prev : new Set(prev).add(leadId)));
  }, []);

  const markRead = useCallback((leadId: string) => {
    const at = new Date().toISOString();
    setState((prev) => {
      const seen = markSeen(prev?.seen ?? parseSeen(read(SEEN_STORAGE_KEY)), leadId, at);
      write(SEEN_STORAGE_KEY, JSON.stringify(seen));
      return { seen, baseline: prev?.baseline ?? at };
    });
    setLive((prev) => {
      if (!prev.has(leadId)) return prev;
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
  }, []);

  const unreadIds = useMemo(() => {
    if (!state) return new Set<string>(live);
    return new Set(leads.filter((l) => isUnread(l, state.seen, state.baseline, live)).map((l) => l.id));
  }, [leads, state, live]);

  const count = state ? countUnread(leads, state.seen, state.baseline, live) : live.size;
  return { unreadIds, count, markLive, markRead };
}

/** Marks one lead as seen from outside the list (e.g. on the detail page). */
export function markLeadSeen(leadId: string): void {
  write(SEEN_STORAGE_KEY, JSON.stringify(markSeen(parseSeen(read(SEEN_STORAGE_KEY)), leadId, new Date().toISOString())));
}
