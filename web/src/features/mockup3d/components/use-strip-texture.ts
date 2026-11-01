"use client";
// CanvasTexture fed live from the designer canvas. One texture per surface (own repeat/offset).
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace } from "three";

export function useStripTexture(
  source: HTMLCanvasElement | null,
  version: number,
  repeatX: number,
  offsetX = 0,
): CanvasTexture | null {
  const invalidate = useThree((s) => s.invalidate);
  const texture = useMemo(() => {
    if (!source) return null;
    const tex = new CanvasTexture(source);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    tex.anisotropy = 4;
    return tex;
  }, [source]);

  useEffect(() => {
    if (!texture) return;
    refreshTexture(texture, repeatX, offsetX);
    invalidate(); // frameloop="demand": redraw with the new pixels
  }, [texture, version, repeatX, offsetX, invalidate]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

/** Re-upload the canvas pixels (content changed) and apply the surface repeat/phase. */
function refreshTexture(texture: CanvasTexture, repeatX: number, offsetX: number): void {
  texture.repeat.set(repeatX, 1);
  texture.offset.set(offsetX, 0);
  texture.needsUpdate = true;
}
