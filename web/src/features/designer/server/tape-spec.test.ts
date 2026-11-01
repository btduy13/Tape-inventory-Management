import { describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

import { DEFAULT_TAPE_SPEC } from "../lib/tape-spec";
import { getTapeSpec } from "./tape-spec";

type Result = { data: unknown; error: unknown };

function fakeClient(widths: Result, settings: Result) {
  const w = { select: vi.fn(() => w), eq: vi.fn(() => w), order: vi.fn((): unknown => w) };
  // Second .order() resolves the widths query.
  let orders = 0;
  w.order = vi.fn(() => (++orders === 2 ? Promise.resolve(widths) : w));
  const s = { select: vi.fn(() => s), maybeSingle: vi.fn(async () => settings) };
  const from = vi.fn((table: string) => (table === "tape_widths" ? w : s));
  return { from, w, s };
}

describe("getTapeSpec", () => {
  it("reads active widths in sort order + the length range", async () => {
    const c = fakeClient(
      { data: [{ width_mm: 12 }, { width_mm: 100 }], error: null },
      { data: { min_length_m: 50, max_length_m: 635, thickness_mic: 45 }, error: null },
    );
    createClient.mockResolvedValue(c);
    const spec = await getTapeSpec();
    expect(c.from).toHaveBeenCalledWith("tape_widths");
    expect(c.from).toHaveBeenCalledWith("tape_spec_settings");
    expect(c.w.eq).toHaveBeenCalledWith("is_active", true);
    expect(c.w.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(spec).toEqual({ widths: [12, 100], minLengthM: 50, maxLengthM: 635, thicknessMic: 45 });
  });

  it("falls back to the seed list when the DB fails", async () => {
    createClient.mockResolvedValue(fakeClient({ data: null, error: { message: "x" } }, { data: null, error: null }));
    expect(await getTapeSpec()).toEqual(DEFAULT_TAPE_SPEC);
    createClient.mockRejectedValue(new Error("env"));
    expect(await getTapeSpec()).toEqual(DEFAULT_TAPE_SPEC);
  });
});
