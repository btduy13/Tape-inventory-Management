// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { analyzeLogoPixels, deltaE, hexToLab, printInks, uniqueInks, type InkInput, type PixelData } from "./logo-colors";

// ---- generated fixtures ----------------------------------------------------------------------

type Px = [number, number, number, number];
function image(w: number, h: number, paint: (x: number, y: number) => Px): PixelData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) data.set(paint(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}
const RED: Px = [200, 16, 46, 255];
const NAVY: Px = [10, 20, 102, 255];
const GREY: Px = [150, 150, 150, 255];
const CLEAR: Px = [0, 0, 0, 0];
const mix = (p: Px, q: Px, t: number): Px => [0, 1, 2, 3].map((i) => Math.round(p[i] * (1 - t) + q[i] * t)) as Px;
const inCircle = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/** Anti-aliased disc edge: 2px soft band between `a` and `b`. */
function aaDisc(x: number, y: number, cx: number, cy: number, r: number, a: Px, b: Px): Px {
  const d = Math.hypot(x - cx, y - cy) - r;
  if (d <= -1) return a;
  if (d >= 1) return b;
  return mix(a, b, (d + 1) / 2);
}

const count = (p: PixelData) => analyzeLogoPixels(p).inks.length;
const near = (hex: string, ref: Px) => deltaE(hexToLab(hex), hexToLab(`#${ref.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("")}`)) < 12;

describe("analyzeLogoPixels", () => {
  it("1 colour on transparency (soft alpha edge ignored)", () => {
    const img = image(120, 120, (x, y) => {
      const d = Math.hypot(x - 60, y - 60) - 40;
      if (d < 0) return RED;
      if (d < 2) return [RED[0], RED[1], RED[2], Math.round(255 * (1 - d / 2))];
      return CLEAR;
    });
    const r = analyzeLogoPixels(img);
    expect(r.inks).toHaveLength(1);
    expect(near(r.inks[0].hex, RED)).toBe(true);
    expect(r.backgroundRemoved).toBe(false);
  });

  it("2 colours with anti-aliased edges between them = 2", () => {
    // Red square with a navy disc; AA band red<->navy must not become a 3rd colour.
    const img = image(200, 200, (x, y) => aaDisc(x, y, 100, 100, 60, NAVY, RED));
    const r = analyzeLogoPixels(img);
    expect(r.inks).toHaveLength(2);
    expect(r.inks.some((i) => near(i.hex, RED))).toBe(true);
    expect(r.inks.some((i) => near(i.hex, NAVY))).toBe(true);
  });

  it("3 colours (Vinh Thinh style: red, navy, grey) = 3", () => {
    const img = image(240, 120, (x, y) => {
      if (x < 80) return RED;
      if (x < 160) return inCircle(x, y, 120, 60, 30) ? GREY : NAVY;
      return x % 40 < 20 ? NAVY : CLEAR;
    });
    expect(count(img)).toBe(3);
  });

  it("grey shading (tints of one ink) counts once; tints never merge different hues", () => {
    const shades: Px[] = [[60, 60, 60, 255], [120, 120, 120, 255], [190, 190, 190, 255], RED, [227, 135, 150, 255]];
    // dark grey + 2 grey tints = 1 ink; red + pink tint = 1 ink
    expect(count(image(250, 50, (x) => shades[Math.floor(x / 50)]))).toBe(2);
  });

  it("photo-like gradient = many colours (> 3)", () => {
    const img = image(256, 64, (x, y) => [
      Math.round(255 * (x / 255)),
      Math.round(255 * (1 - x / 255)),
      Math.round(128 + 120 * Math.sin(y / 10)),
      255,
    ]);
    expect(count(img)).toBeGreaterThan(3);
  });

  it("5 flat colours = 5", () => {
    const cols: Px[] = [RED, NAVY, GREY, [0, 140, 60, 255], [250, 200, 0, 255]];
    expect(count(image(250, 50, (x) => cols[Math.floor(x / 50)]))).toBe(5);
  });

  it("tiny specks (< 0.5%) are ignored", () => {
    const img = image(200, 200, (x, y) => (x < 3 && y < 3 ? NAVY : RED));
    expect(count(img)).toBe(1);
  });

  it("opaque image: near-white background connected to the border is removed, inner white kept", () => {
    const WHITE: Px = [255, 255, 255, 255];
    const img = image(200, 200, (x, y) => {
      if (!inCircle(x, y, 100, 100, 70)) return WHITE;
      return inCircle(x, y, 100, 100, 30) ? WHITE : RED;
    });
    const r = analyzeLogoPixels(img);
    expect(r.backgroundRemoved).toBe(true);
    expect(r.inks).toHaveLength(2); // red + inner white (an ink on non-white film)
  });

  it("empty / fully transparent image = 0", () => {
    expect(count(image(10, 10, () => CLEAR))).toBe(0);
    expect(count({ data: new Uint8ClampedArray(0), width: 0, height: 0 })).toBe(0);
  });
});

// ---- real encoders (sharp): JPEG artefacts, SVG rasterisation ------------------------------

async function decode(buf: Buffer, size = 256): Promise<PixelData> {
  const { data, info } = await sharp(buf).resize(size, size, { fit: "inside", kernel: "nearest" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

describe("analyzeLogoPixels on encoded files", () => {
  it("JPG, white background, 2 colours (red text block + navy bar) = 2", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
      <rect width="400" height="200" fill="#fff"/>
      <rect x="30" y="30" width="200" height="140" fill="#c8102e"/>
      <rect x="260" y="40" width="110" height="120" fill="#0a1466"/></svg>`;
    const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toBuffer();
    const r = analyzeLogoPixels(await decode(jpg));
    expect(r.backgroundRemoved).toBe(true);
    expect(r.inks).toHaveLength(2);
  });

  it("SVG logo with text and anti-aliasing, 3 fills = 3", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150">
      <circle cx="60" cy="75" r="50" fill="#c8102e"/>
      <text x="120" y="70" font-size="40" font-family="Arial" font-weight="bold" fill="#0a1466">VINH</text>
      <rect x="120" y="90" width="160" height="30" fill="#8a8a8a"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const r = analyzeLogoPixels(await decode(png));
    expect(r.backgroundRemoved).toBe(false);
    expect(r.inks).toHaveLength(3);
  });

  it("SVG with a 5-stop gradient = more than 3", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100">
      <defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset=".25" stop-color="#ff0"/>
      <stop offset=".5" stop-color="#0f0"/><stop offset=".75" stop-color="#00f"/><stop offset="1" stop-color="#f0f"/></linearGradient></defs>
      <rect width="300" height="100" fill="url(#g)"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(analyzeLogoPixels(await decode(png)).inks.length).toBeGreaterThan(3);
  });
});

// ---- print ink count ------------------------------------------------------------------------

const base = (o: Partial<InkInput> = {}): InkInput => ({
  backgroundColor: "#d9c3a0",
  textColor: "#c8102e",
  text: "ACME",
  logo: null,
  ...o,
});
const inks = (...hex: string[]) => hex.map((h) => ({ hex: h, coverage: 1 / hex.length }));

describe("printInks", () => {
  it("background (tape film) is not an ink; text colour is", () => {
    expect(printInks(base()).colors).toEqual(["#c8102e"]);
    expect(printInks(base({ text: "  " })).count).toBe(0);
  });

  it("logo colour equal (or near) to the text colour counts once", () => {
    const r = printInks(base({ logo: { inks: inks("#ca122f", "#0a1466") } }));
    expect(r.count).toBe(2);
    expect(r.overLimit).toBe(false);
  });

  it("text near a logo ink (ΔE < 20) prints with that ink: brand red text + red logo = one ink", () => {
    const r = printInks(base({ textColor: "#ed3136", logo: { inks: inks("#ed1110", "#030101") } }));
    expect(r.colors).toEqual(["#ed1110", "#030101"]);
    expect(r.count).toBe(2);
    // Far apart (ΔE > 20) stays two inks.
    expect(printInks(base({ textColor: "#c8102e", logo: { inks: inks("#ed1110") } })).count).toBe(2);
  });

  it("3-colour logo + a 4th text colour is over the limit", () => {
    const r = printInks(base({ textColor: "#007a33", logo: { inks: inks("#c8102e", "#0a1466", "#8a8a8a") } }));
    expect(r.count).toBe(4);
    expect(r.overLimit).toBe(true);
  });

  it("logo alone > 3 colours is over the limit even without text", () => {
    const r = printInks(base({ text: "", logo: { inks: inks("#ff0000", "#00ff00", "#0000ff", "#ffff00") } }));
    expect(r.logoCount).toBe(4);
    expect(r.overLimit).toBe(true);
  });

  it("logo areas in the film colour need no ink", () => {
    const r = printInks(base({ backgroundColor: "#ffffff", text: "", logo: { inks: inks("#ffffff", "#c8102e") } }));
    expect(r.colors).toEqual(["#c8102e"]);
  });

  it("logo always counts its own original colours (no single-ink mode)", () => {
    const many = { inks: inks("#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff") };
    const r = printInks(base({ text: "", logo: many }));
    expect(r.count).toBe(5);
    expect(r.overLimit).toBe(true);
  });

  it("unknown / pending logo colours are flagged, not counted", () => {
    expect(printInks(base({ logo: {} }))).toMatchObject({ logoPending: true, logoUnknown: true, count: 1, overLimit: false });
    expect(printInks(base({ logo: { inks: null } }))).toMatchObject({ logoPending: false, logoUnknown: true });
  });

  it("uniqueInks merges by ΔE, keeps distinct", () => {
    expect(uniqueInks(["#c8102e", "#C8102E", "#ca1230", "#0033a0", "nope"])).toEqual(["#c8102e", "#0033a0"]);
  });
});
