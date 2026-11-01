import { describe, expect, it } from "vitest";
import { DEFAULT_PRESETS, normalizePresets, presetKey, toPresetOption } from "./presets";

describe("presets", () => {
  it("matches seed sizes", () => {
    expect(DEFAULT_PRESETS.map((p) => [p.width_mm, p.length_m, p.thickness_mic])).toEqual([
      [48, 100, 45], [60, 100, 45], [48, 200, 50], [72, 100, 50],
    ]);
  });
  it("converts numeric strings from PostgREST", () => {
    // PostgREST may serialise numeric as strings at runtime.
    const row = { id: "u1", label: "L", width_mm: "48.0", length_m: "100.0", thickness_mic: "45.0" } as unknown as Parameters<typeof toPresetOption>[0];
    const p = toPresetOption(row);
    expect(p).toEqual({ id: "u1", label: "L", width_mm: 48, length_m: 100, thickness_mic: 45 });
  });
  it("normalizes: drops invalid, dedupes, falls back", () => {
    const bad = { id: "x", label: "bad", width_mm: 0, length_m: 1, thickness_mic: 1 };
    const good = { id: "y", label: "ok", width_mm: 48, length_m: 1, thickness_mic: 1 };
    expect(normalizePresets([bad, good, good])).toEqual([good]);
    expect(normalizePresets([])).toHaveLength(4);
    expect(normalizePresets(null)).toHaveLength(4);
    expect(presetKey(DEFAULT_PRESETS[0])).toBe("48x100x45");
  });
});
