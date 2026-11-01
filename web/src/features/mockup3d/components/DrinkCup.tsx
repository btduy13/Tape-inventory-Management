"use client";
// Plastic bubble-tea cup with dome lid and straw; the designed tape wraps the wall as a sticker band.
// Geometry is procedural (LatheGeometry / open cylinders): no model files.
import { useMemo } from "react";
import { DoubleSide, Vector2 } from "three";
import { CUP_CENTER_Y_MM, CUP_MM, cupBand, cupLidProfile, cupLiquidProfile, cupWallProfile, type Pt } from "../lib/cup";
import { textureRepeat, toUnits } from "../lib/geometry";
import { useStripTexture } from "./use-strip-texture";

const SEGMENTS = 72;

type Props = { widthMm: number; source: HTMLCanvasElement | null; version: number; stripLengthMm: number };

const toPoints = (pts: Pt[]) => pts.map(([x, y]) => new Vector2(toUnits(x), toUnits(y)));

function StickerBand({ widthMm, source, version, stripLengthMm }: Props) {
  const band = cupBand(widthMm);
  const texture = useStripTexture(source, version, textureRepeat(band.circumferenceMm, stripLengthMm));
  // thetaStart = PI puts the strip's wrap seam at the back, so the print faces the camera.
  return (
    <mesh position={[0, toUnits(band.centerYMm), 0]}>
      <cylinderGeometry args={[toUnits(band.radiusTop), toUnits(band.radiusBottom), toUnits(band.heightMm), SEGMENTS, 1, true, Math.PI]} />
      <meshStandardMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#d9c3a0"} roughness={0.35} />
    </mesh>
  );
}

export function DrinkCup(props: Props) {
  const wall = useMemo(() => toPoints(cupWallProfile()), []);
  const liquid = useMemo(() => toPoints(cupLiquidProfile()), []);
  const lid = useMemo(() => toPoints(cupLidProfile()), []);
  const strawLength = CUP_MM.strawTop - 20;
  return (
    <group position={[0, -toUnits(CUP_CENTER_Y_MM), 0]}>
      {/* Milk tea inside */}
      <mesh>
        <latheGeometry args={[liquid, SEGMENTS]} />
        <meshStandardMaterial color="#c9a27e" roughness={0.6} />
      </mesh>
      <StickerBand {...props} />
      {/* Clear PP wall + dome lid */}
      <mesh renderOrder={1}>
        <latheGeometry args={[wall, SEGMENTS]} />
        <meshStandardMaterial color="#eef6fb" transparent opacity={0.28} roughness={0.08} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh renderOrder={1}>
        <latheGeometry args={[lid, SEGMENTS]} />
        <meshStandardMaterial color="#f4f8fb" transparent opacity={0.3} roughness={0.08} side={DoubleSide} depthWrite={false} />
      </mesh>
      {/* Straw */}
      <mesh position={[0, toUnits(20 + strawLength / 2), 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[toUnits(CUP_MM.strawRadius), toUnits(CUP_MM.strawRadius), toUnits(strawLength), 20]} />
        <meshStandardMaterial color="#1f2937" roughness={0.4} />
      </mesh>
    </group>
  );
}
