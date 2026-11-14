// Variant "parcel wall": tape prints. Each tape is a film colour, a text and a small mark; they are
// painted on a 2D canvas that the 3D scenes use as a texture. The sample brands are invented shop
// names for the demo (not customers); slot 0 of the hero is always the visitor's own tape.

export type Mark = "ring" | "star" | "heart" | "diamond" | "flower";

export type TapeLook = {
  /** Film colour (any CSS colour; may be translucent for clear tape). */
  bg: string;
  /** Print colour. */
  fg: string;
  /** Second print colour (inside the mark). */
  accent: string;
  mark: Mark;
};

export type Brand = TapeLook & { key: string; text: string; glyph: string };

export const SAMPLE_BRANDS: readonly Brand[] = [
  { key: "may", text: "TRÀ SỮA MÂY", glyph: "♥", bg: "#ffd3df", fg: "#b3123f", accent: "#ffd3df", mark: "heart" },
  { key: "kho", text: "KHO 24H", glyph: "★", bg: "#1f3fd0", fg: "#ffffff", accent: "#1f3fd0", mark: "star" },
  { key: "gom", text: "GỐM MỘC", glyph: "◆", bg: "#b8834f", fg: "#2a1a0c", accent: "#b8834f", mark: "diamond" },
  { key: "bep", text: "BẾP NHÀ LAN", glyph: "✿", bg: "#1f7a4d", fg: "#f4f1e4", accent: "#1f7a4d", mark: "flower" },
  { key: "sang", text: "CÀ PHÊ SÁNG", glyph: "●", bg: "#17181c", fg: "#ffd21f", accent: "#17181c", mark: "ring" },
];

/** Tape canvas: 4 px per mm, 48 mm wide, two print repeats (9 tape widths long). */
export const TAPE_PX = { w: 48 * 9 * 4, h: 48 * 4 };

function paintMark(ctx: CanvasRenderingContext2D, mark: Mark, cx: number, cy: number, r: number, fg: string, accent: string) {
  ctx.fillStyle = fg;
  ctx.beginPath();
  if (mark === "star") {
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
  } else if (mark === "heart") {
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.2, cx, cy - r * 0.35);
    ctx.bezierCurveTo(cx + r * 0.7, cy - r * 1.2, cx + r * 1.6, cy - r * 0.2, cx, cy + r * 0.9);
  } else if (mark === "diamond") {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
  } else if (mark === "flower") {
    for (let i = 0; i < 5; i++) {
      const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
      ctx.moveTo(cx + Math.cos(a) * r * 0.55 + r * 0.5, cy + Math.sin(a) * r * 0.55);
      ctx.arc(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.5, 0, Math.PI * 2);
    }
  } else {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fill();
  if (mark === "ring" || mark === "flower") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (mark === "ring" ? 0.42 : 0.3), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paints the film, then two repeats of mark + text. `text` null = plain, unprinted tape. */
export function drawTape(c: HTMLCanvasElement, text: string | null, look: TapeLook) {
  c.width = TAPE_PX.w;
  c.height = TAPE_PX.h;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const h = c.height;
  const half = c.width / 2;
  ctx.clearRect(0, 0, c.width, h);
  ctx.fillStyle = look.bg;
  ctx.fillRect(0, 0, c.width, h);
  if (text === null) return;
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(h * 0.42)}px "Segoe UI", Roboto, Arial, sans-serif`;
  for (let i = 0; i < 2; i++) {
    const x0 = i * half;
    paintMark(ctx, look.mark, x0 + h * 0.5, h / 2, h * 0.23, look.fg, look.accent);
    ctx.fillStyle = look.fg;
    ctx.fillText(text, x0 + h * 0.92, h / 2 + 2, half - h * 1.1);
  }
}
