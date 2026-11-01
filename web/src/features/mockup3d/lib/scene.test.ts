import { describe, expect, it } from "vitest";
import { cameraPosition, fitDistance } from "./camera";
import {
  CUP_MM, CUP_STRIP_MAX_MM, CUP_STRIP_MIN_MM, cupBoundingRadiusMm, cupLidOutline, cupLidProfile, cupRadiusAt, cupStripPath,
  cupStripRibbon, cupStripRows, cupStripWidthMm, cupWallProfile,
} from "./cup";
import { ribbonOrientation } from "./ribbon";
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

  it("builds lathe profiles with positive radii", () => {
    for (const prof of [cupWallProfile(), cupLidProfile()]) {
      expect(prof.length).toBeGreaterThanOrEqual(4);
      for (const [x] of prof) expect(x).toBeGreaterThan(0);
    }
    expect(cupLidProfile().at(-1)![1]).toBeCloseTo(CUP_MM.height + CUP_MM.lidHeight);
    // lid skirt covers the rolled rim
    expect(cupLidOutline()[0][0]).toBeGreaterThan(CUP_MM.rimRadius + 1.5);
  });

  it("strip width is proportional to the tape width, clamped", () => {
    expect(cupStripWidthMm(48)).toBe(24);
    expect(cupStripWidthMm(60)).toBe(30);
    expect(cupStripWidthMm(4)).toBe(CUP_STRIP_MIN_MM);
    expect(cupStripWidthMm(500)).toBe(CUP_STRIP_MAX_MM);
    expect(cupStripWidthMm(Number.NaN)).toBe(CUP_STRIP_MIN_MM);
  });

  it("strip path climbs the tapered wall, crosses the rim and ends on the lid top", () => {
    const path = cupStripPath(24);
    expect(path[0].y).toBeCloseTo(CUP_MM.stripStart, 0);
    for (const p of path.filter((q) => q.y < CUP_MM.height - 8)) {
      // just outside the taper, normal pointing outwards
      expect(p.r).toBeGreaterThan(cupRadiusAt(p.y));
      expect(p.r - cupRadiusAt(p.y)).toBeLessThan(1);
      expect(p.nr).toBeGreaterThan(0.9);
    }
    const last = path.at(-1)!;
    expect(last.y).toBeGreaterThan(CUP_MM.height + CUP_MM.lidHeight - 3);
    expect(last.ny).toBeGreaterThan(0.9);
    expect(last.r).toBeGreaterThanOrEqual(12 + 3);
    for (let i = 1; i < path.length; i++) expect(path[i].along).toBeGreaterThan(path[i - 1].along);
  });

  it("strip is a narrow vertical label hugging the round wall, print unmirrored", () => {
    for (const row of cupStripRows(24)) {
      // facing +z: v=0 at +x, v=1 at -x (letter tops face left, text reads bottom to top)
      expect(row.points[0][0]).toBeCloseTo(12);
      expect(row.points.at(-1)![0]).toBeCloseTo(-12);
      const r = Math.hypot(row.points[4][0], row.points[4][2]);
      for (const p of row.points) {
        expect(Math.hypot(p[0], p[2])).toBeCloseTo(r);
        expect(p[2]).toBeGreaterThan(0);
      }
    }
    expect(ribbonOrientation(cupStripRibbon(48, 300))).toEqual({ outward: true, unmirrored: true });
  });

  it("print period scales with the strip so the artwork keeps its aspect", () => {
    const r = cupStripRibbon(48, 300);
    expect(r.uvs[r.uvs.length - 2]).toBeCloseTo(cupStripRows(24).at(-1)!.along / 150);
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
    expect(f.floorY).toBeLessThanOrEqual(-toUnits(CARTON_MM.height) / 2);
  });

  it("cup sphere contains cup and lid", () => {
    expect(toUnits(cupBoundingRadiusMm())).toBeCloseTo(viewFrame("cup", preset).radius);
    expect(cupBoundingRadiusMm()).toBeGreaterThanOrEqual((CUP_MM.height + CUP_MM.lidHeight) / 2);
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
