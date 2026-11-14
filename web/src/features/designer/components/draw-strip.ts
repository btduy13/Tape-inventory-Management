"use client";
// Plain 2D-canvas renderer of a pattern layout: the same picture as the Konva stage (tape colour,
// border lines, colour blocks, turned tiles, rotated logo, multi-line text), used for the live
// pattern thumbnails. Browser only.
import { borderShapes } from "../lib/border";
import { TEXT_LINE_HEIGHT } from "../lib/constants";
import type { PatternLayout, StripSize } from "../lib/pattern";
import type { DesignBorderStyle } from "@/lib/types";

export type StripPaint = {
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  /** Printed text, lines joined with "\n". */
  text: string;
  borderStyle: DesignBorderStyle;
  logo: CanvasImageSource | null;
  /** Logo silhouette in the tape colour (colour blocks), or null. */
  knockout: CanvasImageSource | null;
};

/** Draws strip x in [0, cropWidth) of `layout` onto `ctx`, scaled by `scale`. */
export function drawStrip(
  ctx: CanvasRenderingContext2D,
  strip: StripSize,
  layout: PatternLayout,
  paint: StripPaint,
  scale: number,
  cropWidth = strip.width,
): void {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.beginPath();
  ctx.rect(0, 0, cropWidth, strip.height);
  ctx.clip();
  ctx.fillStyle = paint.backgroundColor;
  ctx.fillRect(0, 0, cropWidth, strip.height);

  // Border lines.
  const border = borderShapes(strip, paint.borderStyle, layout.borderPx);
  ctx.fillStyle = paint.textColor;
  for (const r of border.rects) ctx.fillRect(r.x, r.y, r.width, r.height);
  for (const b of border.bands) {
    if (border.stripes.length === 0) break;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, b.top, strip.width, b.bottom - b.top);
    ctx.clip();
    for (const p of border.stripes.filter((q) => q[1] === b.top)) {
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Content, clipped inside the border lines.
  ctx.beginPath();
  ctx.rect(0, layout.clip.top, strip.width, layout.clip.bottom - layout.clip.top);
  ctx.clip();
  for (const t of layout.tiles) {
    if (!t.fill) continue;
    ctx.fillStyle = paint.textColor;
    ctx.fillRect(t.cell.x, t.cell.y, t.cell.width, t.cell.height);
  }
  const lines = paint.text.split("\n");
  const lineH = layout.textHeightRatio === 1 ? 1 : TEXT_LINE_HEIGHT;
  for (const t of layout.tiles) {
    ctx.save();
    const tr = t.transform;
    if (tr) {
      ctx.translate(tr.pivotX + tr.dx, tr.pivotY + tr.dy);
      ctx.rotate((tr.rotation * Math.PI) / 180);
      ctx.scale(tr.scale, tr.scale);
      ctx.translate(-tr.pivotX, -tr.pivotY);
    }
    const image = t.fill && paint.knockout ? paint.knockout : paint.logo;
    if (t.logo && image && layout.logoSize) {
      const { width: w, height: h } = layout.logoSize;
      ctx.save();
      ctx.translate(t.logo.x + t.logo.width / 2, t.logo.y + t.logo.height / 2);
      ctx.rotate((layout.logoRotation * Math.PI) / 180);
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    if (t.text) {
      ctx.fillStyle = t.fill ? paint.backgroundColor : paint.textColor;
      ctx.font = `bold ${layout.fontSize}px "${paint.fontFamily}"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = t.text.x + t.text.width / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, cx, t.text!.y + (i + 0.5) * layout.fontSize * lineH);
      });
    }
    ctx.restore();
  }
  ctx.restore();
}
