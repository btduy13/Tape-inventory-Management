import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { cameraPosition, fitDistance, orbitLimits, refitDirection } from "./camera";
import {
  CUP_CENTER_Y_MM, CUP_MM, CUP_STRIP_MAX_MM, CUP_STRIP_MIN_MM, cupBoundingRadiusMm, cupLidOutline, cupLidProfile, cupRadiusAt, cupStripPath,
  cupStripRibbon, cupStripRows, cupStripSurface, cupStripWidthMm, cupWallProfile,
} from "./cup";
import { ribbonOrientation } from "./ribbon";
import { CARTON_MM, cartonLayout, rollGeometry, toUnits, type RollPreset } from "./geometry";
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

  it("re-fits for every width from phone to desktop, sphere always inside both FOVs", () => {
    for (const view of MOCKUP_VIEWS) {
      const { radius } = viewFrame(view, preset);
      for (const [w, h] of [[320, 400], [375, 469], [768, 576], [1440, 1080], [1920, 600]]) {
        const aspect = w / h;
        const d = fitDistance(radius, 40, aspect);
        const vHalf = (20 * Math.PI) / 180;
        const hHalf = Math.atan(Math.tan(vHalf) * aspect);
        // angular radius of the sphere fits the tighter half-FOV
        expect(Math.asin(radius / d)).toBeLessThanOrEqual(Math.min(vHalf, hHalf) + 1e-9);
        const { min, max } = orbitLimits(d);
        expect(min).toBeLessThan(d);
        expect(max).toBeGreaterThan(d);
      }
    }
  });

  it("keeps the orbited angle on resize, resets to the view default otherwise", () => {
    expect(refitDirection([1, 2, 3], [0, 0, 1])).toEqual([1, 2, 3]);
    expect(refitDirection(null, [0, 0, 1])).toEqual([0, 0, 1]);
    expect(refitDirection([0, 0, 0], [0, 0, 1])).toEqual([0, 0, 1]);
    expect(refitDirection([Number.NaN, 1, 1], [0, 0, 1])).toEqual([0, 0, 1]);
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

  it("lid outline is convex so the strip can touch it everywhere", () => {
    const o = cupLidOutline();
    let prev = -Infinity;
    for (let i = 1; i < o.length; i++) {
      const a = Math.atan2(o[i][1] - o[i - 1][1], o[i][0] - o[i - 1][0]);
      expect(a).toBeGreaterThan(prev);
      prev = a;
    }
    expect(o.at(-1)).toEqual([0, CUP_MM.height + CUP_MM.lidHeight]);
  });

  it("seal path is one continuous strip: front wall, over the lid centre, back wall", () => {
    const path = cupStripPath();
    const pos = (p: (typeof path)[number]) => [p.side * p.r, p.y];
    // starts and ends at stripStart, on opposite sides
    expect(path[0].y).toBeCloseTo(CUP_MM.stripStart + 0, 0);
    expect(path.at(-1)!.y).toBeCloseTo(CUP_MM.stripStart, 0);
    expect(path[0].side * path[0].r).toBeGreaterThan(30);
    expect(path.at(-1)!.side * path.at(-1)!.r).toBeLessThan(-30);
    // continuity: consecutive centre points are close, along strictly increasing
    for (let i = 1; i < path.length; i++) {
      const [z0, y0] = pos(path[i - 1]);
      const [z1, y1] = pos(path[i]);
      expect(Math.hypot(z1 - z0, y1 - y0)).toBeLessThan(2.5);
      expect(path[i].along).toBeGreaterThan(path[i - 1].along);
    }
    // passes over the lid centre at the top
    const top = path.reduce((a, b) => (b.y > a.y ? b : a));
    expect(top.r).toBeLessThan(1e-6);
    expect(top.y).toBeGreaterThan(CUP_MM.height + CUP_MM.lidHeight);
    // hugs the taper on both sides (just outside, normal outwards)
    for (const p of path.filter((q) => q.y < CUP_MM.height - 12)) {
      expect(p.r - cupRadiusAt(p.y)).toBeGreaterThan(0);
      expect(p.r - cupRadiusAt(p.y)).toBeLessThan(0.6);
      expect(p.nr).toBeGreaterThan(0.99);
    }
    // symmetric
    expect(path.filter((p) => p.side === 1).length).toBe(path.filter((p) => p.side === -1).length + 1);
  });

  it("strip rows hug every surface at constant width, no gaps between rows", () => {
    const rows = cupStripRows(24);
    const surf = cupStripSurface(0);
    for (const row of rows) {
      // constant width across (lateral x from +12 to -12)
      expect(row.points[0][0]).toBeCloseTo(12);
      expect(row.points.at(-1)![0]).toBeCloseTo(-12);
      for (const p of row.points) {
        // every vertex sits within a hair of the cup/lid surface
        const rho = Math.hypot(p[0], p[2]);
        let best = Infinity;
        for (let i = 1; i < surf.length; i++) {
          const [r0, y0] = surf[i - 1];
          const [r1, y1] = surf[i];
          const dr = r1 - r0, dy = y1 - y0;
          const t = Math.max(0, Math.min(1, ((rho - r0) * dr + (p[1] - y0) * dy) / (dr * dr + dy * dy || 1)));
          best = Math.min(best, Math.hypot(rho - (r0 + t * dr), p[1] - (y0 + t * dy)));
        }
        expect(best).toBeGreaterThan(0.05);
        expect(best).toBeLessThan(0.8);
      }
    }
    for (let i = 1; i < rows.length; i++) {
      for (let j = 0; j < rows[i].points.length; j++) {
        const a = rows[i - 1].points[j];
        const b = rows[i].points[j];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(3);
      }
    }
    // visible on both sides
    expect(rows.some((r) => r.points[4][2] > 30)).toBe(true);
    expect(rows.some((r) => r.points[4][2] < -30)).toBe(true);
  });

  it("print is unmirrored and outward on both sides and across the top", () => {
    const r = cupStripRibbon(48, 300);
    expect(ribbonOrientation(r)).toEqual({ outward: true, unmirrored: true });
    // one quad strip with no folds: every row pair is joined
    const rows = cupStripRows(24).length;
    expect(r.indices.length).toBe((rows - 1) * 8 * 6);
  });

  it("print period scales with the strip so the artwork keeps its aspect", () => {
    const r = cupStripRibbon(48, 300);
    expect(r.uvs[r.uvs.length - 2]).toBeCloseTo(cupStripRows(24).at(-1)!.along / 150);
  });
});

/** Points on the outside of each view's object, in scene units (same placement as the components). */
function hullPoints(view: (typeof MOCKUP_VIEWS)[number], p: RollPreset): Vector3[] {
  const pts: Vector3[] = [];
  const ring = (r: number, y: number, at = (v: Vector3) => v) => {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      pts.push(at(new Vector3(r * Math.cos(a), y, r * Math.sin(a))));
    }
  };
  if (view === "roll") {
    const g = rollGeometry(p);
    for (const y of [g.width * 0.51, -g.width * 0.51]) ring(g.outerRadius, y);
  } else if (view === "carton") {
    const l = cartonLayout(p);
    const [hx, hy, hz] = [CARTON_MM.length, CARTON_MM.height, CARTON_MM.depth].map((v) => toUnits(v) / 2);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(new Vector3(sx * hx, sy * hy + l.offsetY, sz * hz));
    const g = rollGeometry(p);
    const [rx, ry, rz] = l.rollPosition;
    // roll axis along z: ring in the x/y plane at both faces
    for (const z of [g.width / 2, -g.width / 2]) {
      ring(g.outerRadius, 0, (v) => new Vector3(rx + v.x, ry + v.z + l.offsetY, rz + z));
    }
  } else {
    const c = toUnits(CUP_CENTER_Y_MM);
    for (const [r, y] of [...cupWallProfile(), ...cupLidProfile()]) ring(toUnits(r), toUnits(y) - c);
  }
  return pts;
}

describe("camera fit robustness (what the designer passes)", () => {
  const aspects = [16 / 9, 1, 4 / 5, 4 / 3, 0.5, 2.4];
  const widths = [12, 24, 48, 80];
  const lengths = [50, 100, 300, 635];
  it("every view, roll size and aspect: whole object inside the frame with margin", () => {
    for (const view of MOCKUP_VIEWS) {
      for (const width_mm of widths) {
        for (const length_m of lengths) {
          const p = { width_mm, length_m, thickness_mic: 48 };
          const frame = viewFrame(view, p);
          const pts = hullPoints(view, p);
          for (const aspect of aspects) {
            const cam = new PerspectiveCamera(40, aspect, 0.01, 1000);
            cam.position.set(...cameraPosition(frame.direction, fitDistance(frame.radius, 40, aspect)));
            cam.lookAt(0, 0, 0);
            cam.updateMatrixWorld();
            cam.updateProjectionMatrix();
            for (const pt of pts) {
              const ndc = pt.clone().project(cam);
              expect(Math.abs(ndc.x)).toBeLessThan(0.95);
              expect(Math.abs(ndc.y)).toBeLessThan(0.95);
            }
          }
        }
      }
    }
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
