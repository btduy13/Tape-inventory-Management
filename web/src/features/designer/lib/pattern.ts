// Repeating pattern layout on the tape strip. Pure geometry; text width is measured by the caller.
import { PX_PER_MM, STRIP_LENGTH_MM } from "./constants";

export type StripSize = { width: number; height: number };

/** Logical strip size in px: length along X, tape width along Y. */
export function stripSize(widthMm: number, lengthMm: number = STRIP_LENGTH_MM): StripSize {
  return { width: Math.round(lengthMm * PX_PER_MM), height: Math.round(widthMm * PX_PER_MM) };
}

export type PatternInput = {
  strip: StripSize;
  textWidth: number;
  /** Logo natural aspect ratio (w/h), or null when no logo. */
  logoAspect: number | null;
  logoScale: number;
  logoOffsetX: number;
  logoOffsetY: number;
  repeatGapPx: number;
};

export type Box = { x: number; y: number; width: number; height: number };
export type PatternTile = { logo: Box | null; textX: number | null };

export type PatternLayout = {
  /** Distance between tile starts. strip.width / count, so the strip wraps seamlessly. */
  period: number;
  count: number;
  tiles: PatternTile[];
  logoSize: { width: number; height: number } | null;
};

/** Fraction of the strip height a logo at scale 1 occupies. */
export const LOGO_HEIGHT_RATIO = 0.7;

export function computePatternLayout(input: PatternInput): PatternLayout {
  const { strip, textWidth, logoAspect } = input;
  const hasText = textWidth > 0;
  const logoSize =
    logoAspect && logoAspect > 0
      ? {
          height: strip.height * LOGO_HEIGHT_RATIO * input.logoScale,
          width: strip.height * LOGO_HEIGHT_RATIO * input.logoScale * logoAspect,
        }
      : null;

  if (!hasText && !logoSize) return { period: strip.width, count: 0, tiles: [], logoSize: null };

  const innerGap = hasText && logoSize ? strip.height * 0.15 : 0;
  const contentWidth = (logoSize?.width ?? 0) + innerGap + (hasText ? textWidth : 0);
  const tileWidth = contentWidth + Math.max(0, input.repeatGapPx);
  const count = Math.max(1, Math.floor(strip.width / Math.max(1, tileWidth)));
  const period = strip.width / count;

  const tiles: PatternTile[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * period + (period - contentWidth) / 2;
    const logo = logoSize
      ? {
          x: start + input.logoOffsetX * strip.height,
          y: (strip.height - logoSize.height) / 2 + input.logoOffsetY * strip.height,
          width: logoSize.width,
          height: logoSize.height,
        }
      : null;
    const textX = hasText ? start + (logoSize ? logoSize.width + innerGap : 0) : null;
    tiles.push({ logo, textX });
  }
  return { period, count, tiles, logoSize };
}
