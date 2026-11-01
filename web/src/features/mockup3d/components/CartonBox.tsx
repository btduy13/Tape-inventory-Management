"use client";
// Carton box sealed with one continuous strip of the designed tape: up the back flap,
// across the top seam and down the front flap (like real sealing tape).
import { CARTON_MM, cartonTapeSegments, textureOffset, textureRepeat, toUnits, type CartonTapeSegment } from "../lib/geometry";
import { useStripTexture } from "./use-strip-texture";

const CARTON_COLOR = "#b8875a";
const SEAM_COLOR = "#6f4a2b";

type Props = { widthMm: number; source: HTMLCanvasElement | null; version: number; stripLengthMm: number };

function TapeSegment({ seg, widthMm, source, version, stripLengthMm }: Props & { seg: CartonTapeSegment }) {
  const texture = useStripTexture(
    source,
    version,
    textureRepeat(seg.lengthMm, stripLengthMm),
    textureOffset(seg.startMm, stripLengthMm),
  );
  return (
    <mesh position={seg.position} rotation={seg.rotation}>
      <planeGeometry args={[toUnits(seg.lengthMm), toUnits(widthMm)]} />
      <meshStandardMaterial
        map={texture ?? undefined}
        color={texture ? "#ffffff" : "#d9c3a0"}
        roughness={0.3}
        metalness={0.02}
        transparent
        opacity={0.97}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

export function CartonBox(props: Props) {
  const { length, depth, height } = CARTON_MM;
  const h2 = toUnits(height) / 2;
  return (
    <group>
      <mesh>
        <boxGeometry args={[toUnits(length), toUnits(height), toUnits(depth)]} />
        <meshStandardMaterial color={CARTON_COLOR} roughness={0.95} />
      </mesh>
      {/* Flap seam along the top (under the tape) and flap fold lines on the front/back */}
      <mesh position={[0, h2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.012, toUnits(depth)]} />
        <meshBasicMaterial color={SEAM_COLOR} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, h2 - 0.004, side * (toUnits(depth) / 2 + 0.001)]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[toUnits(length), 0.008]} />
          <meshBasicMaterial color={SEAM_COLOR} transparent opacity={0.5} />
        </mesh>
      ))}
      {cartonTapeSegments().map((seg) => (
        <TapeSegment key={seg.name} seg={seg} {...props} />
      ))}
    </group>
  );
}
