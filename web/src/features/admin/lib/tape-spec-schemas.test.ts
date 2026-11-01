import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import {
  addWidthSchema, lengthLimitsSchema, moveWidthSchema, nextSortOrder, reorderWidths, toggleWidthSchema,
} from "./tape-spec-schemas";
import { moveWidth, saveLengthLimits } from "../server/tape-specs";

const ID = "0b0c0d0e-1111-4222-8333-444455556666";

describe("tape size admin schemas", () => {
  it("accepts whole-mm widths 1..200 only", () => {
    expect(addWidthSchema.safeParse({ widthMm: "100" }).data).toEqual({ widthMm: 100 });
    for (const bad of ["0", "201", "12.5", "", "abc"]) expect(addWidthSchema.safeParse({ widthMm: bad }).success).toBe(false);
  });

  it("parses toggle / move forms", () => {
    expect(toggleWidthSchema.parse({ id: ID, isActive: "false" })).toEqual({ id: ID, isActive: false });
    expect(moveWidthSchema.safeParse({ id: ID, direction: "left" }).success).toBe(false);
    expect(toggleWidthSchema.safeParse({ id: "x", isActive: "true" }).success).toBe(false);
  });

  it("length range: rounds to 0.1 m and needs min <= max", () => {
    expect(lengthLimitsSchema.parse({ minLengthM: "50", maxLengthM: "635.04", thicknessMic: "45" }))
      .toEqual({ minLengthM: 50, maxLengthM: 635, thicknessMic: 45 });
    expect(lengthLimitsSchema.safeParse({ minLengthM: "700", maxLengthM: "635", thicknessMic: "45" }).success).toBe(false);
    expect(lengthLimitsSchema.safeParse({ minLengthM: "0", maxLengthM: "635", thicknessMic: "45" }).success).toBe(false);
  });

  it("reorders by swapping neighbours; edges are a no-op", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorderWidths(rows, "b", "up")?.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(reorderWidths(rows, "b", "down")?.map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(reorderWidths(rows, "a", "up")).toBeNull();
    expect(reorderWidths(rows, "zz", "up")).toBeNull();
    expect(nextSortOrder([{ sort_order: 130 }, { sort_order: 10 }])).toBe(140);
    expect(nextSortOrder([])).toBe(10);
  });
});

describe("tape size admin mutations", () => {
  it("moveWidth renumbers only the rows whose position changed", async () => {
    const rows = [
      { id: "a", width_mm: 12, sort_order: 10 },
      { id: "b", width_mm: 15, sort_order: 20 },
      { id: "c", width_mm: 16, sort_order: 30 },
    ];
    const updates: unknown[] = [];
    const list = { select: vi.fn(() => list), order: vi.fn((): unknown => list) };
    let orders = 0;
    list.order = vi.fn(() => (++orders % 2 === 0 ? Promise.resolve({ data: rows }) : list));
    const update = vi.fn((v: unknown) => ({ eq: vi.fn(async (_c: string, id: string) => { updates.push([id, v]); return { error: null }; }) }));
    const db = { from: vi.fn(() => ({ ...list, update })) } as unknown as SupabaseClient<Database>;
    expect(await moveWidth(db, { id: "c", direction: "up" })).toEqual({ ok: true });
    expect(updates).toEqual([["c", { sort_order: 20 }], ["b", { sort_order: 30 }]]);
  });

  it("saveLengthLimits maps RLS / check errors", async () => {
    const chain = (res: unknown) => {
      const q = { update: vi.fn(() => q), eq: vi.fn(() => q), select: vi.fn(() => q), maybeSingle: vi.fn(async () => res) };
      return { from: vi.fn(() => q) } as unknown as SupabaseClient<Database>;
    };
    const input = { minLengthM: 50, maxLengthM: 635, thicknessMic: 45 };
    expect(await saveLengthLimits(chain({ data: { id: true }, error: null }), input)).toEqual({ ok: true });
    expect(await saveLengthLimits(chain({ data: null, error: null }), input)).toEqual({ ok: false, reason: "forbidden" });
    expect(await saveLengthLimits(chain({ data: null, error: { code: "23514" } }), input)).toEqual({ ok: false, reason: "invalid" });
  });
});
