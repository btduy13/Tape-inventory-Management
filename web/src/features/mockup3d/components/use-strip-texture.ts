"use client";
// CanvasTexture fed live from the designer canvas. One texture per surface (own repeat).
import { useEffect, useMemo } from "react";
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace } from "three";

export function useStripTexture(source: HTMLCanvasElement | null, version: number, repeatX: number): CanvasTexture | null {
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
    if (texture) refreshTexture(texture, repeatX);
  }, [texture, version, repeatX]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

/** Re-upload the canvas pixels (content changed) and apply the surface repeat. */
function refreshTexture(texture: CanvasTexture, repeatX: number): void {
  texture.repeat.set(repeatX, 1);
  texture.needsUpdate = true;
}
