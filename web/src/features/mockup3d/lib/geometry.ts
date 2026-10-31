// Real-world tape roll / carton geometry in mm, converted to scene units. Pure + unit-tested.

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

/** Standard carton used in the mockup (mm). */
export const CARTON_MM = { length: 400, depth: 300, height: 250 } as const;
/** Tape that wraps down the front and back faces (mm). */
export const CARTON_FLAP_MM = 80;

export type CartonTapeSegment = {
  name: "top" | "front" | "back";
  lengthMm: number;
  position: [number, number, number];
  rotation: [number, number, number];
};

/** Tape segments for a carton sealed along its depth (z axis), centred on x. */
export function cartonTapeSegments(eps = 0.002): CartonTapeSegment[] {
  const { depth, height } = CARTON_MM;
  const flap = Math.min(CARTON_FLAP_MM, height);
  const h2 = toUnits(height) / 2;
  const d2 = toUnits(depth) / 2;
  return [
    { name: "top", lengthMm: depth, position: [0, h2 + eps, 0], rotation: [-Math.PI / 2, 0, -Math.PI / 2] },
    { name: "front", lengthMm: flap, position: [0, h2 - toUnits(flap) / 2, d2 + eps], rotation: [0, 0, -Math.PI / 2] },
    { name: "back", lengthMm: flap, position: [0, h2 - toUnits(flap) / 2, -d2 - eps], rotation: [0, Math.PI, -Math.PI / 2] },
  ];
}
