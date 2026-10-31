"use client";
// Tape roll standing on its side: printed outer surface, translucent layer edges, paper core.
import { DoubleSide, BackSide } from "three";
import { rollGeometry, textureRepeat, type RollPreset } from "../lib/geometry";
import { useStripTexture } from "./use-strip-texture";

const SEGMENTS = 96;
const CORE_COLOR = "#a47148";
const EDGE_COLOR = "#c9a66b";

type Props = { preset: RollPreset; source: HTMLCanvasElement | null; version: number; stripLengthMm: number };

export function TapeRoll({ preset, source, version, stripLengthMm }: Props) {
  const g = rollGeometry(preset);
  const texture = useStripTexture(source, version, textureRepeat(g.circumferenceMm, stripLengthMm));
  const half = g.width / 2;

  return (
    <group>
      {/* Printed outer surface */}
      <mesh>
        <cylinderGeometry args={[g.outerRadius, g.outerRadius, g.width, SEGMENTS, 1, true]} />
        <meshStandardMaterial map={texture ?? undefined} color={texture ? "#ffffff" : EDGE_COLOR} roughness={0.35} metalness={0.05} />
      </mesh>
      {/* Wound layer edges (top + bottom) */}
      {[half, -half].map((y) => (
        <mesh key={`edge${y}`} position={[0, y, 0]} rotation={[y > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
          <ringGeometry args={[g.coreOuterRadius, g.outerRadius, SEGMENTS]} />
          <meshStandardMaterial color={EDGE_COLOR} transparent opacity={0.85} roughness={0.2} side={DoubleSide} />
        </mesh>
      ))}
      {/* Paper core: inner wall + rims */}
      <mesh>
        <cylinderGeometry args={[g.innerRadius, g.innerRadius, g.width * 1.02, SEGMENTS, 1, true]} />
        <meshStandardMaterial color={CORE_COLOR} roughness={0.9} side={BackSide} />
      </mesh>
      {[half * 1.02, -half * 1.02].map((y) => (
        <mesh key={`core${y}`} position={[0, y, 0]} rotation={[y > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
          <ringGeometry args={[g.innerRadius, g.coreOuterRadius, SEGMENTS]} />
          <meshStandardMaterial color={CORE_COLOR} roughness={0.9} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
