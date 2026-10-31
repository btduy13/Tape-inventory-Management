import { describe, expect, it } from "vitest";
import { DEFAULT_PRESETS, normalizePresets, presetKey, toPresetOption } from "./presets";
import { hasTransparency, tintPixels } from "./tint";

describe("tintPixels", () => {
  const ink = { r: 200, g: 16, b: 46 };

  it("keeps alpha mask for transparent images", () => {
    const d = new Uint8ClampedArray([10, 20, 30, 0, 250, 250, 250, 255]);
    expect(hasTransparency(d)).toBe(true);
    tintPixels(d, ink);
    expect([...d]).toEqual([200, 16, 46, 0, 200, 16, 46, 255]);
  });

  it("uses darkness for opaque images (white -> transparent, black -> ink)", () => {
    const d = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    tintPixels(d, ink);
    expect(d[3]).toBe(0);
    expect(d[7]).toBe(255);
    expect([d[4], d[5], d[6]]).toEqual([200, 16, 46]);
  });
});

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
