import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

import { getActivePresets } from "./presets";

function fakeClient(result: { data: unknown; error: unknown }) {
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(async () => result),
  };
  return { from: vi.fn(() => q), q };
}

describe("getActivePresets", () => {
  beforeEach(() => createClient.mockReset());

  it("maps active rows ordered by sort_order", async () => {
    const c = fakeClient({ data: [{ id: "a", label: "A", width_mm: "60", length_m: "100", thickness_mic: "45" }], error: null });
    createClient.mockResolvedValue(c);
    const res = await getActivePresets();
    expect(c.from).toHaveBeenCalledWith("tape_presets");
    expect(c.q.eq).toHaveBeenCalledWith("is_active", true);
    expect(c.q.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(res).toEqual([{ id: "a", label: "A", width_mm: 60, length_m: 100, thickness_mic: 45 }]);
  });

  it("falls back to defaults on error or missing env", async () => {
    createClient.mockResolvedValue(fakeClient({ data: null, error: { message: "x" } }));
    expect(await getActivePresets()).toHaveLength(4);
    createClient.mockImplementation(async () => {
      throw new Error("env");
    });
    expect(await getActivePresets()).toHaveLength(4);
  });
});
