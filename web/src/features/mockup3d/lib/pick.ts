// Eyedropper maths. Pure + unit-tested (no DOM, no WebGL).
//
// A raycast hit on a printed tape mesh gives the mesh UV. The colour the customer designed is the
// pixel of the 2D source canvas that the texture maps there, so we repeat three.js' own texture
// lookup on the CPU: uv' = uv * repeat + offset (Texture.matrix with rotation 0), then the wrap
// mode per axis, then flipY (CanvasTexture default: canvas row 0 is at v = 1).
import { ClampToEdgeWrapping, MirroredRepeatWrapping, RepeatWrapping } from "three";

/** userData flag on meshes printed with the design texture (roll surface, carton / cup strips). */
export const TAPE_PRINT = { tapePrint: true } as const;

export type Vec2Like = { x: number; y: number };

/** The texture fields the lookup needs (a three.js Texture satisfies this shape). */
export type TextureMapping = {
  repeat: Vec2Like;
  offset: Vec2Like;
  wrapS: number;
  wrapT: number;
  flipY: boolean;
};

/** Where a pick came from: the design source canvas, the lit render, or the OS screen picker. */
export type PickSource = "design" | "render" | "screen";

export type PickResult = {
  hex: string;
  source: PickSource;
  /** Source canvas pixel (design picks only). */
  pixel?: { x: number; y: number };
};

function wrap(t: number, mode: number): number {
  if (mode === RepeatWrapping) return t - Math.floor(t);
  if (mode === MirroredRepeatWrapping) {
    const m = t - 2 * Math.floor(t / 2); // 0..2
    return m <= 1 ? m : 2 - m;
  }
  return Math.min(1, Math.max(0, t)); // ClampToEdgeWrapping and anything unknown
}

/** UV (mesh attribute, interpolated at the hit) -> integer pixel of a `width` x `height` canvas. */
export function uvToPixel(uv: Vec2Like, tex: TextureMapping, width: number, height: number): { x: number; y: number } {
  const u = wrap(uv.x * tex.repeat.x + tex.offset.x, tex.wrapS);
  const v = wrap(uv.y * tex.repeat.y + tex.offset.y, tex.wrapT);
  const row = tex.flipY ? 1 - v : v;
  const px = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
  const py = Math.min(height - 1, Math.max(0, Math.floor(row * height)));
  return { x: px, y: py };
}

/** The mapping useStripTexture gives every printed surface (repeat along the strip, clamp across). */
export function stripTextureMapping(repeatX: number, offsetX = 0): TextureMapping {
  return { repeat: { x: repeatX, y: 1 }, offset: { x: offsetX, y: 0 }, wrapS: RepeatWrapping, wrapT: ClampToEdgeWrapping, flipY: true };
}

const hex2 = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");

/** "#rrggbb" from 8-bit channels. */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/**
 * Pointer position (CSS px relative to the canvas box) -> WebGL drawing-buffer pixel for
 * gl.readPixels (origin bottom-left). Returns null outside the buffer.
 */
export function cssToBufferPixel(
  cssX: number,
  cssY: number,
  cssW: number,
  cssH: number,
  bufW: number,
  bufH: number,
): { x: number; y: number } | null {
  if (!(cssW > 0 && cssH > 0)) return null;
  const x = Math.floor((cssX / cssW) * bufW);
  const y = bufH - 1 - Math.floor((cssY / cssH) * bufH);
  return x >= 0 && y >= 0 && x < bufW && y < bufH ? { x, y } : null;
}
