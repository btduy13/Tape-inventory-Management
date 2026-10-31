// Merges status log + internal notes into one newest-first timeline.
import type { LeadNote, LeadStatus, LeadStatusLog } from "@/lib/types";

export type TimelineEntry =
  | {
      kind: "status";
      key: string;
      at: string;
      actorId: string | null;
      from: LeadStatus | null;
      to: LeadStatus;
      note: string | null;
    }
  | { kind: "note"; key: string; at: string; actorId: string | null; body: string };

export function buildTimeline(
  log: readonly Pick<LeadStatusLog, "id" | "created_at" | "changed_by" | "from_status" | "to_status" | "note">[],
  notes: readonly Pick<LeadNote, "id" | "created_at" | "author_id" | "body">[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...log.map((l) => ({
      kind: "status" as const,
      key: `s${l.id}`,
      at: l.created_at,
      actorId: l.changed_by,
      from: l.from_status,
      to: l.to_status,
      note: l.note,
    })),
    ...notes.map((n) => ({
      kind: "note" as const,
      key: `n${n.id}`,
      at: n.created_at,
      actorId: n.author_id,
      body: n.body,
    })),
  ];
  // ISO 8601 UTC strings sort lexicographically; tie-break by key for stable output.
  return entries.sort((a, b) => (a.at === b.at ? b.key.localeCompare(a.key) : b.at.localeCompare(a.at)));
}

/** Unique, non-null actor ids (to fetch display names in one query). */
export function actorIds(entries: readonly TimelineEntry[]): string[] {
  return [...new Set(entries.map((e) => e.actorId).filter((id): id is string => !!id))];
}

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}
