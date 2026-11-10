// Pure helpers of the review queue UI (0036 groups). Shared by the client list and its tests.
import type { ReviewRow } from "./types";

/** 'source_table:source_id' of the row shown for a group: what bulk create / regroup take. */
export const reviewKey = (r: Pick<ReviewRow, "source_table" | "source_id">) => `${r.source_table}:${r.source_id}`;

const clean = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ");

/** Distinct typed names of the group, most used first. */
export function spellings(r: ReviewRow): string[] {
  const n = new Map<string, number>();
  for (const m of r.members) {
    const s = clean(m.ten_khach_hang);
    if (s) n.set(s, (n.get(s) ?? 0) + 1);
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

/** A group can become a customer only when some row has a name (SQL skips the others too). */
export const hasName = (r: ReviewRow) => !!clean(r.ten_khach_hang) || spellings(r).length > 0;

/** Bulk create takes only plain same-name groups (SQL re-checks every row): other reasons mean a
 *  customer with that name / phone may exist, so they stay one-by-one decisions. */
export const canBulkCreate = (r: ReviewRow) => hasName(r) && r.reason === "same name, no phone";

export const groupName = (r: ReviewRow) => spellings(r)[0] ?? (clean(r.ten_khach_hang) || r.source_id);

export const groupTotal = (r: ReviewRow) => r.members.reduce((sum, m) => sum + (Number(m.tong_tien) || 0), 0);
