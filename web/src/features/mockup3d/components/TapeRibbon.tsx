"use client";
// Printed tape strip mesh (glossy, slightly translucent) from pure ribbon data (mm).
import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry } from "three";
import type { RibbonData } from "../lib/ribbon";
import { useStripTexture } from "./use-strip-texture";

type Props = { data: RibbonData; source: HTMLCanvasElement | null; version: number };

export function TapeRibbon({ data, source, version }: Props) {
  // UVs already encode the print period along the strip.
  const texture = useStripTexture(source, version, 1);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(data.positions, 3));
    g.setAttribute("normal", new BufferAttribute(data.normals, 3));
    g.setAttribute("uv", new BufferAttribute(data.uvs, 2));
    g.setIndex(data.indices);
    g.computeBoundingSphere();
    return g;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} scale={0.01} renderOrder={2}>
      <meshPhysicalMaterial
        map={texture ?? undefined}
        color={texture ? "#ffffff" : "#d9c3a0"}
        roughness={0.22}
        metalness={0}
        clearcoat={0.5}
        clearcoatRoughness={0.2}
        transparent
        opacity={0.96}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}
