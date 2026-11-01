// Logo ink analysis + print ink count (max-3-ink rule). Pure: works on RGBA pixel data, no DOM.
//
// Rule (owner): a print uses at most MAX_COLORS inks in total. Inks = distinct colours actually
// printed: logo colours + text colour (+ the single logo ink in "tint" mode). Same colour = one ink,
// so a logo colour equal to the text colour counts once (merged in Lab, ΔE < INK_MERGE_DE).
// Text vs logo uses a wider tolerance (ΔE < TEXT_LOGO_MATCH_DE): text close to a logo ink is printed
// with that logo ink ("logo colour and text colour are one").
// The tape background is the film (substrate: clear, white, kraft...), not an ink: it is not counted,
// and logo areas in the film colour need no ink either.
import { MAX_COLORS } from "./constants";
import { hexToRgb, logoInkColor, normalizeHex, type PaletteInput } from "./palette";

export type Rgb = { r: number; g: number; b: number };
export type Lab = { L: number; a: number; b: number };

/** One ink found in a logo. `coverage` = share of the counted ink pixels (0..1). */
export type LogoInk = { hex: string; coverage: number };

export type LogoColorAnalysis = {
  /** Dominant inks, largest coverage first. */
  inks: LogoInk[];
  /** True when a near-white background (opaque image) was detected and ignored. */
  backgroundRemoved: boolean;
};

export type PixelData = { data: Uint8ClampedArray; width: number; height: number };

/** ΔE76 below which two colours are treated as the same ink. */
export const INK_MERGE_DE = 12;
/** ΔE76 below which the text colour counts as (and is printed with) the nearest logo ink. */
export const TEXT_LOGO_MATCH_DE = 20;
/** Neighbour ΔE above which a pixel is an edge (anti-aliasing) pixel and is not sampled. */
const EDGE_DE = 10;
/** Clusters smaller than this share of the sampled pixels are noise. */
export const MIN_INK_COVERAGE = 0.005;
/** Pixels with alpha below this are treated as transparent / soft edge. */
const ALPHA_MIN = 200;
/** Max inks listed in design_json (the count itself is not capped). */
export const MAX_INK_REPORT = 12;
/** Downscale target for analysis (longest side). */
export const ANALYSIS_MAX_SIDE = 256;

// ---------------------------------------------------------------------------------------------
// Colour space

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

export function rgbToLab({ r, g, b }: Rgb): Lab {
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export const hexToLab = (hex: string): Lab => rgbToLab(hexToRgb(hex));

export function deltaE(p: Lab, q: Lab): number {
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;

const isNearWhite = (lab: Lab) => lab.L >= 90 && Math.hypot(lab.a, lab.b) <= 8;

// ---------------------------------------------------------------------------------------------
// Logo analysis

/**
 * Counts the dominant ink colours of a logo.
 * - transparent pixels and soft (semi-transparent) edges are ignored;
 * - an opaque image's near-white background, connected to the border, is ignored;
 * - edge pixels (big jump to a neighbour = anti-aliasing) are not sampled;
 * - colours are clustered in Lab (ΔE < INK_MERGE_DE), clusters < MIN_INK_COVERAGE dropped,
 *   small clusters lying between two bigger ones (blends) are dropped, and lighter tints of an
 *   ink (towards white: halftone shading) are merged into that ink.
 */
export function analyzeLogoPixels({ data, width, height }: PixelData): LogoColorAnalysis {
  const n = width * height;
  if (n === 0 || data.length < n * 4) return { inks: [], backgroundRemoved: false };

  // Lab per pixel (null = not ink: transparent / background).
  const labs: (Lab | null)[] = new Array(n);
  let translucent = 0;
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    if (a < 250) translucent++;
    labs[i] = a < ALPHA_MIN ? null : rgbToLab({ r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] });
  }

  // Opaque image (no real alpha): flood-fill a near-white background from the border.
  let backgroundRemoved = false;
  if (translucent < n * 0.01) backgroundRemoved = removeWhiteBackground(labs, width, height);

  // Sample interior pixels only.
  const samples: Lab[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = labs[y * width + x];
      if (!p) continue;
      let edge = false;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = labs[ny * width + nx];
        // Next to transparency / background counts as an edge only when that pixel was a soft edge.
        if (q ? deltaE(p, q) > EDGE_DE : data[(ny * width + nx) * 4 + 3] > 0 && data[(ny * width + nx) * 4 + 3] < ALPHA_MIN) {
          edge = true;
          break;
        }
      }
      if (!edge) samples.push(p);
    }
  }
  // Tiny / all-edge logos (thin line art): fall back to every ink pixel.
  if (samples.length < 32) for (const p of labs) if (p) samples.push(p);

  return { inks: clusterInks(samples), backgroundRemoved };
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function removeWhiteBackground(labs: (Lab | null)[], w: number, h: number): boolean {
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const white = border.filter((i) => labs[i] && isNearWhite(labs[i]!));
  // Background only when most of the border is near-white.
  if (white.length < border.length * 0.6) return false;
  const stack = [...white];
  const seen = new Uint8Array(w * h);
  for (const i of white) seen[i] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    labs[i] = null;
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      const q = labs[j];
      if (!seen[j] && q && isNearWhite(q)) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return true;
}

const WHITE_LAB: Lab = { L: 100, a: 0, b: 0 };

type Cluster = { L: number; a: number; b: number; count: number };

function clusterInks(samples: Lab[]): LogoInk[] {
  if (samples.length === 0) return [];
  // Pre-bin (2 Lab units) so clustering is O(bins), then greedy merge by size.
  const bins = new Map<string, Cluster>();
  for (const p of samples) {
    const key = `${Math.round(p.L / 2)},${Math.round(p.a / 2)},${Math.round(p.b / 2)}`;
    const c = bins.get(key);
    if (c) {
      c.L += p.L;
      c.a += p.a;
      c.b += p.b;
      c.count++;
    } else bins.set(key, { L: p.L, a: p.a, b: p.b, count: 1 });
  }
  const sorted = [...bins.values()]
    .map((c) => ({ L: c.L / c.count, a: c.a / c.count, b: c.b / c.count, count: c.count }))
    .sort((x, y) => y.count - x.count);
  const clusters: Cluster[] = [];
  for (const bin of sorted) {
    const hit = clusters.find((c) => deltaE(c, bin) < INK_MERGE_DE);
    if (hit) {
      const t = hit.count + bin.count;
      hit.L = (hit.L * hit.count + bin.L * bin.count) / t;
      hit.a = (hit.a * hit.count + bin.a * bin.count) / t;
      hit.b = (hit.b * hit.count + bin.b * bin.count) / t;
      hit.count = t;
    } else clusters.push({ ...bin });
  }
  const total = samples.length;
  let kept = clusters.filter((c) => c.count / total >= MIN_INK_COVERAGE).sort((x, y) => y.count - x.count);
  // Blend test: a small cluster close to the segment between two bigger clusters is a mix of them.
  kept = kept.filter((c, i) => {
    for (let j = 0; j < i; j++) {
      for (let k = j + 1; k < i; k++) {
        const p = kept[j];
        const q = kept[k];
        if (c.count < Math.min(p.count, q.count) * 0.25 && distToSegment(c, p, q) < INK_MERGE_DE / 2) return false;
      }
    }
    return true;
  });
  // Tint test: a lighter colour on the line from a darker ink to white is a screen tint of that
  // ink (grey shading of black, pink of red): same plate, one ink. Darkest inks are the bases.
  const bases: Cluster[] = [];
  for (const c of [...kept].sort((x, y) => x.L - y.L)) {
    const base = bases.find((k) => c.L > k.L + 5 && isTintOf(c, k));
    if (base) base.count += c.count;
    else bases.push({ ...c });
  }
  kept = bases.sort((x, y) => y.count - x.count);
  const keptTotal = kept.reduce((s, c) => s + c.count, 0) || 1;
  return kept.map((c) => ({ hex: labToHex(c), coverage: c.count / keptTotal }));
}

/** `c` is `k` screened towards white: on the Lab line, or the sRGB "opacity over white" line. */
function isTintOf(c: Lab, k: Lab): boolean {
  if (distToSegment(c, k, WHITE_LAB) < INK_MERGE_DE / 2) return true;
  const cr = hexToRgb(labToHex(c));
  const kr = hexToRgb(labToHex(k));
  const pairs = [[cr.r, kr.r], [cr.g, kr.g], [cr.b, kr.b]] as const;
  // Least-squares t for c = k + t * (255 - k), then the worst channel residual.
  let num = 0;
  let den = 0;
  for (const [cv, kv] of pairs) {
    num += (cv - kv) * (255 - kv);
    den += (255 - kv) ** 2;
  }
  const t = den === 0 ? 0 : num / den;
  if (t < 0.08 || t > 0.92) return false;
  return Math.max(...pairs.map(([cv, kv]) => Math.abs(cv - (kv + t * (255 - kv))))) < 16;
}

function distToSegment(p: Lab, a: Lab, b: Lab): number {
  const ab = [b.L - a.L, b.a - a.a, b.b - a.b];
  const ap = [p.L - a.L, p.a - a.a, p.b - a.b];
  const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = len2 === 0 ? 0 : (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2;
  if (t <= 0.05 || t >= 0.95) return Infinity; // near an endpoint: it is that colour, not a blend
  return Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]);
}

// Lab -> sRGB hex (for swatches).
export function labToHex({ L, a, b }: Lab): string {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * 0.95047;
  const y = inv(fy);
  const z = inv(fz) * 1.08883;
  const R = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  const G = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  const B = 0.0557 * x - 0.204 * y + 1.057 * z;
  const gam = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);
  return toHex({ r: gam(R), g: gam(G), b: gam(B) });
}

// ---------------------------------------------------------------------------------------------
// Print ink count

export type InkInput = PaletteInput & {
  text: string;
  logoColorMode: "original" | "tint";
  /** null: no logo. `inks` null: logo not analysed (unknown). */
  logo: { inks?: LogoInk[] | null } | null;
};

export type InkSummary = {
  /** Distinct printed inks (hex), text first, then logo inks. */
  colors: string[];
  count: number;
  /** Inks found in the logo alone (original colours, film colour excluded). */
  logoCount: number;
  /** Logo colours not known yet (analysing) or at all (analysis failed). */
  logoUnknown: boolean;
  /** Analysis still running. */
  logoPending: boolean;
  overLimit: boolean;
};

/** Merge colours that are the same ink (ΔE < INK_MERGE_DE). First occurrence wins. */
export function uniqueInks(colors: readonly string[]): string[] {
  const out: { hex: string; lab: Lab }[] = [];
  for (const c of colors) {
    const hex = normalizeHex(c);
    if (!hex) continue;
    const lab = rgbToLab(hexToRgb(hex));
    if (!out.some((o) => deltaE(o.lab, lab) < INK_MERGE_DE)) out.push({ hex, lab });
  }
  return out.map((o) => o.hex);
}

/** Inks the design prints. Background (tape film) is never an ink. */
export function printInks(s: InkInput): InkSummary {
  const bg = rgbToLab(hexToRgb(s.backgroundColor));
  const notFilm = (hex: string) => deltaE(rgbToLab(hexToRgb(hex)), bg) >= INK_MERGE_DE;
  const list: string[] = [];
  if (s.text.trim()) list.push(s.textColor);
  let logoInks: string[] = [];
  let logoUnknown = false;
  let logoPending = false;
  if (s.logo) {
    if (s.logoColorMode === "tint") logoInks = [logoInkColor(s)];
    else if (s.logo.inks) logoInks = uniqueInks(s.logo.inks.map((i) => i.hex)).filter(notFilm);
    else {
      logoUnknown = true;
      logoPending = s.logo.inks === undefined;
    }
  }
  // Text close to a logo ink is printed with that ink: it adds no ink of its own.
  if (list.length && logoInks.length && s.logoColorMode !== "tint") {
    const tl = rgbToLab(hexToRgb(list[0]));
    if (logoInks.some((l) => deltaE(rgbToLab(hexToRgb(l)), tl) < TEXT_LOGO_MATCH_DE)) list.length = 0;
  }
  const colors = uniqueInks([...list, ...logoInks]);
  return {
    colors,
    count: colors.length,
    logoCount: logoInks.length,
    logoUnknown,
    logoPending,
    overLimit: colors.length > MAX_COLORS || logoInks.length > MAX_COLORS,
  };
}
