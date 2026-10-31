// "Unread" tracking for the portal list. Per-viewer convenience only (browser storage);
// authoritative data always comes from the server via RLS.

export type SeenMap = Record<string, string>; // leadId -> ISO time last opened

export const SEEN_STORAGE_KEY = "orders.seen.v1";
export const BASELINE_STORAGE_KEY = "orders.baseline.v1";
const MAX_ENTRIES = 500;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

export type UnreadLead = { id: string; updated_at: string };

/** A lead is unread when it changed after the viewer last opened it (or after the baseline). */
export function isUnread(lead: UnreadLead, seen: SeenMap, baseline: string, live: ReadonlySet<string>): boolean {
  if (live.has(lead.id)) return true;
  const since = seen[lead.id] ?? baseline;
  return toMs(lead.updated_at) > toMs(since);
}

export function countUnread(
  leads: readonly UnreadLead[],
  seen: SeenMap,
  baseline: string,
  live: ReadonlySet<string>,
): number {
  return leads.reduce((n, l) => n + (isUnread(l, seen, baseline, live) ? 1 : 0), 0);
}

export function markSeen(seen: SeenMap, leadId: string, at: string): SeenMap {
  const next: SeenMap = { ...seen, [leadId]: at };
  const keys = Object.keys(next);
  if (keys.length <= MAX_ENTRIES) return next;
  // Drop the oldest entries.
  keys.sort((a, b) => toMs(next[a]) - toMs(next[b]));
  for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete next[k];
  return next;
}

/** Defensive parse of untrusted storage content. */
export function parseSeen(raw: string | null): SeenMap {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: SeenMap = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && ISO_RE.test(v) && k.length <= 64) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function parseBaseline(raw: string | null, now: string): string {
  return raw && ISO_RE.test(raw) ? raw : now;
}

function toMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}
