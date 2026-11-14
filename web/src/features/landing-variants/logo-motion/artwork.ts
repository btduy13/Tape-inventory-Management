export type Mark = "flower" | "spark" | "orbit";
export const PALETTES = [
  { id: "yellow", name: "Vàng / xanh", bg: "#ffe02b", ink: "#123cb5" },
  { id: "white", name: "Trắng / đỏ", bg: "#fff9ec", ink: "#cf2838" },
  { id: "blue", name: "Xanh / trắng", bg: "#1647c9", ink: "#fff9ec" },
] as const;
export type Palette = typeof PALETTES[number];

// Original demonstration symbols, not customer logos. Upload replaces them locally.
export function paintMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, mark: Mark, ink: string, bg: string) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = ink;
  if (mark === "flower") {
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.beginPath();
      ctx.ellipse(0, -size * .23, size * .145, size * .25, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, size * .14, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
  } else if (mark === "spark") {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; const r = size * (i % 2 ? .22 : .48); if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  } else {
    ctx.lineWidth = size * .12; ctx.strokeStyle = ink;
    for (const angle of [-.65, .65]) { ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.ellipse(0,0,size*.43,size*.2,0,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0,0,size*.09,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

export function paintStrip(canvas: HTMLCanvasElement, palette: Palette, mark: Mark, uploaded?: HTMLImageElement | null) {
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.fillStyle = palette.bg; ctx.fillRect(0,0,1024,256);
  for (let i = 0; i < 4; i++) {
    const x = i * 256 + 128;
    if (uploaded) {
      const s = 174 / Math.max(uploaded.width, uploaded.height);
      ctx.drawImage(uploaded, x-uploaded.width*s/2,128-uploaded.height*s/2,uploaded.width*s,uploaded.height*s);
    } else paintMark(ctx,x,128,182,mark,palette.ink,palette.bg);
  }
}
