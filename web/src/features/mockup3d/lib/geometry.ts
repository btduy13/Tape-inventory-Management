// Real-world tape roll / carton geometry in mm, converted to scene units. Pure + unit-tested.
import type { RibbonRow, V3 } from "./ribbon";

export type RollPreset = { width_mm: number; length_m: number; thickness_mic: number };

/** 1 scene unit = 100 mm. */
export const MM_PER_UNIT = 100;
export const CORE_INNER_DIAMETER_MM = 76; // 3" paper core
export const CORE_WALL_MM = 6;
/** Visual clamp so extreme presets still frame nicely. */
export const MAX_OUTER_RADIUS_MM = 120;

export const toUnits = (mm: number) => mm / MM_PER_UNIT;

/**
 * Outer radius of a wound roll: area of the annulus equals tape length x thickness.
 * pi (R^2 - r^2) = L * t  =>  R = sqrt(r^2 + L t / pi)
 */
export function rollOuterRadiusMm(lengthM: number, thicknessMic: number, coreOuterRadiusMm: number): number {
  const l = Math.max(0, lengthM) * 1000;
  const t = Math.max(0, thicknessMic) / 1000;
  const r = Math.sqrt(coreOuterRadiusMm ** 2 + (l * t) / Math.PI);
  return Math.min(MAX_OUTER_RADIUS_MM, r);
}

export type RollGeometry = {
  innerRadius: number;
  coreOuterRadius: number;
  outerRadius: number;
  width: number;
  /** Outer circumference in mm (texture repeat basis). */
  circumferenceMm: number;
};

export function rollGeometry(p: RollPreset): RollGeometry {
  const innerMm = CORE_INNER_DIAMETER_MM / 2;
  const coreOuterMm = innerMm + CORE_WALL_MM;
  const outerMm = Math.max(coreOuterMm + 1, rollOuterRadiusMm(p.length_m, p.thickness_mic, coreOuterMm));
  return {
    innerRadius: toUnits(innerMm),
    coreOuterRadius: toUnits(coreOuterMm),
    outerRadius: toUnits(outerMm),
    width: toUnits(Math.max(1, p.width_mm)),
    circumferenceMm: 2 * Math.PI * outerMm,
  };
}

/** How many strip periods fit along a surface of `surfaceMm` (texture.repeat.x). */
export function textureRepeat(surfaceMm: number, stripLengthMm: number): number {
  if (!(stripLengthMm > 0) || !(surfaceMm > 0)) return 1;
  return surfaceMm / stripLengthMm;
}

/** Kraft carton used in the mockup (mm): x = length, y = height, z = depth. */
export const CARTON_MM = { length: 400, depth: 280, height: 240 } as const;
/** How far the tape folds down over each short end face (mm). */
export const CARTON_FLAP_MM = 150;
/** Gap between carton and tape so the strip never z-fights the board. */
const CARTON_TAPE_GAP_MM = 0.6;

/**
 * One straight strip centred on the top seam, running along the carton LENGTH (x) and
 * folding down over both short end faces: down the -x end, across the top, down the +x end.
 * Rows are in mm. Side vector s = n x t = -z on all three faces, so the print stays upright
 * and continues seamlessly across both folds.
 */
export function cartonStripRows(widthMm: number, gap = CARTON_TAPE_GAP_MM): RibbonRow[] {
  const { length, depth, height } = CARTON_MM;
  const w = Math.min(depth, Math.max(5, widthMm || 0));
  const flap = Math.min(CARTON_FLAP_MM, height);
  const x = length / 2 + gap;
  const top = height / 2 + gap;
  const low = height / 2 - flap;
  const row = (along: number, p: V3, n: V3): RibbonRow => ({
    along,
    // v=0 at +z, v=1 at -z (= +s)
    points: [[p[0], p[1], w / 2], [p[0], p[1], -w / 2]],
    normals: [n, n],
  });
  const left: V3 = [-1, 0, 0];
  const up: V3 = [0, 1, 0];
  const right: V3 = [1, 0, 0];
  return [
    row(0, [-x, low, 0], left),
    row(flap, [-x, top, 0], left),
    row(flap, [-x, top, 0], up),
    row(flap + length, [x, top, 0], up),
    row(flap + length, [x, top, 0], right),
    row(2 * flap + length, [x, low, 0], right),
  ];
}

export type CartonLayout = {
  /** Group y offset (scene units) that centres box + roll on the origin. */
  offsetY: number;
  /** Roll centre (scene units, before offset); its axis lies along z. */
  rollPosition: V3;
  radius: number;
  floorY: number;
};

/** Box with a tape roll standing on the strip near the far (-x) end, centred for framing. */
export function cartonLayout(preset: RollPreset): CartonLayout {
  const { length, depth, height } = CARTON_MM;
  const R = rollGeometry(preset).outerRadius;
  const h2 = toUnits(height) / 2;
  const rollPosition: V3 = [-toUnits(length) / 2 + R + 0.3, h2 + R + toUnits(1), 0];
  const offsetY = -R;
  const corner = Math.hypot(toUnits(length) / 2, h2 + R, toUnits(depth) / 2);
  return { offsetY, rollPosition, radius: corner, floorY: -h2 + offsetY };
}
