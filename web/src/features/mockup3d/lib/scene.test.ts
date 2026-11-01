import { describe, expect, it } from "vitest";
import { cameraPosition, fitDistance } from "./camera";
import { CUP_BAND_MAX_MM, CUP_MM, cupBand, cupBoundingRadiusMm, cupLidProfile, cupLiquidProfile, cupRadiusAt, cupWallProfile } from "./cup";
import { CARTON_MM, toUnits } from "./geometry";
import { isSilencedThreeMessage } from "./three-console";
import { MOCKUP_VIEWS, viewFrame } from "./views";

const preset = { width_mm: 48, length_m: 100, thickness_mic: 45 };

describe("camera fit", () => {
  it("fits the sphere in the tighter FOV", () => {
    const wide = fitDistance(1, 40, 2, 1);
    expect(wide).toBeCloseTo(1 / Math.sin((20 * Math.PI) / 180));
    // portrait: horizontal FOV is tighter -> camera farther away
    expect(fitDistance(1, 40, 0.5, 1)).toBeGreaterThan(wide);
    expect(fitDistance(2, 40, 2, 1)).toBeCloseTo(2 * wide);
    expect(Number.isFinite(fitDistance(1, 40, 0))).toBe(true);
  });

  it("places the camera at distance along the direction", () => {
    const p = cameraPosition([3, 0, 4], 10);
    expect(p).toEqual([6, 0, 8]);
    expect(cameraPosition([0, 0, 0], 5)).toEqual([0, 0, 0]);
  });
});

describe("cup geometry", () => {
  it("tapers from base to rim", () => {
    expect(cupRadiusAt(0)).toBe(CUP_MM.baseRadius);
    expect(cupRadiusAt(CUP_MM.height)).toBe(CUP_MM.rimRadius);
    expect(cupRadiusAt(-10)).toBe(CUP_MM.baseRadius);
    expect(cupRadiusAt(75)).toBeGreaterThan(CUP_MM.baseRadius);
  });

  it("builds lathe profiles with positive radii and rising height", () => {
    for (const prof of [cupWallProfile(), cupLiquidProfile(), cupLidProfile()]) {
      expect(prof.length).toBeGreaterThanOrEqual(4);
      for (const [x] of prof) expect(x).toBeGreaterThan(0);
    }
    const lid = cupLidProfile();
    expect(lid.at(-1)![1]).toBeCloseTo(CUP_MM.height + 1 + CUP_MM.lidHeight);
    expect(lid.at(-1)![0]).toBeGreaterThan(CUP_MM.strawRadius);
    // liquid stays inside the wall
    for (const [x, y] of cupLiquidProfile()) expect(x).toBeLessThan(cupRadiusAt(y));
  });

  it("wraps the band just outside the wall, clamped to the cup", () => {
    const b = cupBand(48);
    expect(b.heightMm).toBe(48);
    expect(b.radiusBottom).toBeGreaterThan(cupRadiusAt(b.centerYMm - 24));
    expect(b.radiusTop).toBeGreaterThan(b.radiusBottom);
    expect(b.circumferenceMm).toBeCloseTo(Math.PI * (b.radiusTop + b.radiusBottom));
    expect(cupBand(500).heightMm).toBe(CUP_BAND_MAX_MM);
    expect(cupBand(Number.NaN).heightMm).toBe(10);
    const big = cupBand(500);
    expect(big.centerYMm + big.heightMm / 2).toBeLessThan(CUP_MM.height);
    expect(big.centerYMm - big.heightMm / 2).toBeGreaterThan(0);
  });
});

describe("view framing", () => {
  it("covers every view with a positive radius", () => {
    for (const v of MOCKUP_VIEWS) {
      const f = viewFrame(v, preset);
      expect(f.radius).toBeGreaterThan(0);
      expect(f.floorY).toBeLessThan(0);
    }
  });

  it("carton sphere contains the whole box (no clipped bottom)", () => {
    const f = viewFrame("carton", preset);
    const corner = Math.hypot(toUnits(CARTON_MM.length) / 2, toUnits(CARTON_MM.height) / 2, toUnits(CARTON_MM.depth) / 2);
    expect(f.radius).toBeGreaterThanOrEqual(corner - 1e-9);
    expect(f.floorY).toBeCloseTo(-toUnits(CARTON_MM.height) / 2);
  });

  it("cup sphere contains rim and straw", () => {
    expect(toUnits(cupBoundingRadiusMm())).toBeCloseTo(viewFrame("cup", preset).radius);
    expect(cupBoundingRadiusMm()).toBeGreaterThanOrEqual(CUP_MM.strawTop / 2);
  });

  it("roll sphere grows with the roll", () => {
    expect(viewFrame("roll", { ...preset, length_m: 500 }).radius).toBeGreaterThan(viewFrame("roll", preset).radius);
  });
});

describe("three console filter", () => {
  it("silences only the Clock deprecation", () => {
    expect(isSilencedThreeMessage("THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.")).toBe(true);
    expect(isSilencedThreeMessage("THREE.WebGLRenderer: Context Lost.")).toBe(false);
    expect(isSilencedThreeMessage(undefined)).toBe(false);
  });
});
