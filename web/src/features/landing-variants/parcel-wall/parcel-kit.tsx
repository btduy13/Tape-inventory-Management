"use client";
// Variant "parcel wall" 3D kit: things people seal with printed tape (a kraft carton, a foam cool
// box, a poly mailer, a paper bag, a drink cup), each with its tape already on. World units are
// metres. Every texture is drawn on a local canvas (no network): kraft paper, a shipping label and
// the live tape prints.
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, PlaneGeometry, RepeatWrapping, SRGBColorSpace, type Group, type Texture } from "three";

export const TAPE_W = 0.07;
/** World length that one tape canvas (two print repeats) covers at full tape width. */
export const STRIP_LEN = TAPE_W * 9;
/** Gap between a surface and anything stuck on it (with polygonOffset: no z-fighting). */
const LIFT = 0.0015;

export type ItemKind = "carton" | "foam" | "mailer" | "bag" | "cup";
export type ItemSize = [length: number, height: number, depth: number];

let kraft: CanvasTexture | null = null;
/** Kraft paper: speckles, short fibres and a hint of corrugation. One shared texture. */
export function kraftTexture(): CanvasTexture {
  if (kraft) return kraft;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#c69d6c";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 9) {
    ctx.fillStyle = "rgba(110, 78, 44, 0.05)";
    ctx.fillRect(0, y, 512, 2);
  }
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(88, 58, 28, ${0.03 + Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1);
  }
  ctx.strokeStyle = "rgba(255, 238, 208, 0.07)";
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + Math.random() * 14, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  kraft = new CanvasTexture(c);
  kraft.colorSpace = SRGBColorSpace;
  kraft.wrapS = kraft.wrapT = RepeatWrapping;
  return kraft;
}

let foam: CanvasTexture | null = null;
/** Expanded foam: white with a fine bead pattern. One shared texture. */
function foamTexture(): CanvasTexture {
  if (foam) return foam;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f6f7f5";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(150, 158, 165, ${0.05 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  foam = new CanvasTexture(c);
  foam.colorSpace = SRGBColorSpace;
  foam.wrapS = foam.wrapT = RepeatWrapping;
  return foam;
}

let label: CanvasTexture | null = null;
/** Generic shipping label: header bar, address lines, barcode. Decorative, no real data. */
function labelTexture(): CanvasTexture {
  if (label) return label;
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fbfbf9";
  ctx.fillRect(0, 0, 320, 200);
  ctx.fillStyle = "#15171c";
  ctx.fillRect(0, 0, 320, 44);
  ctx.fillStyle = "#fbfbf9";
  ctx.font = '800 26px "Segoe UI", Arial, sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText("GIAO HÀNG", 14, 23);
  ctx.fillStyle = "#15171c";
  [64, 84, 104].forEach((y, i) => ctx.fillRect(14, y, [200, 150, 176][i], 8));
  let x = 14;
  while (x < 300) {
    const w = 2 + Math.floor(Math.random() * 4);
    ctx.fillRect(x, 132, w, 52);
    x += w + 2 + Math.floor(Math.random() * 4);
  }
  label = new CanvasTexture(c);
  label.colorSpace = SRGBColorSpace;
  return label;
}

/** Re-upload the canvas pixels (the print changed). */
function reupload(texture: CanvasTexture): void {
  texture.needsUpdate = true;
}

/** Live textures of the tape print canvases; re-uploaded whenever `version` changes. */
export function useTapeTextures(sources: readonly (HTMLCanvasElement | null)[], version: number): (CanvasTexture | null)[] {
  const invalidate = useThree((s) => s.invalidate);
  const textures = useMemo(
    () =>
      sources.map((source) => {
        if (!source) return null;
        const tex = new CanvasTexture(source);
        tex.colorSpace = SRGBColorSpace;
        tex.wrapS = RepeatWrapping;
        tex.anisotropy = 8;
        return tex;
      }),
    [sources],
  );
  useEffect(() => {
    textures.forEach((t) => t && reupload(t));
    invalidate();
  }, [textures, version, invalidate]);
  useEffect(() => () => textures.forEach((t) => t?.dispose()), [textures]);
  return textures;
}

/** A tape piece `along` metres long. UVs are in real length, so the print never stretches. */
function stripGeometry(along: number, axis: "x" | "y", uStart: number, width: number): PlaneGeometry {
  const g = axis === "x" ? new PlaneGeometry(along, width) : new PlaneGeometry(width, along);
  const period = STRIP_LEN * (width / TAPE_W);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (axis === "x") uv.setXY(i, uStart + (u * along) / period, v);
    else uv.setXY(i, uStart + ((1 - v) * along) / period, u);
  }
  return g;
}

/**
 * One strip of tape over the top of something: `span` long, at height `top`, folded `fold` down
 * both ends. `turn` lays it front-to-back instead of left-to-right.
 */
function TopStrip({ span, top, fold, width = TAPE_W, tape, turn = false }: { span: number; top: number; fold: number; width?: number; tape: Texture; turn?: boolean }) {
  const geo = useMemo(
    () => ({ top: stripGeometry(span, "x", 0, width), fold: stripGeometry(Math.max(fold, 0.001), "y", span / (STRIP_LEN * (width / TAPE_W)), width) }),
    [span, fold, width],
  );
  useEffect(
    () => () => {
      geo.top.dispose();
      geo.fold.dispose();
    },
    [geo],
  );
  const material = <meshStandardMaterial map={tape} transparent roughness={0.28} polygonOffset polygonOffsetFactor={-4} />;
  return (
    <group rotation={[0, turn ? Math.PI / 2 : 0, 0]}>
      <mesh geometry={geo.top} position={[0, top + LIFT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {material}
      </mesh>
      {fold > 0 && (
        <>
          <mesh geometry={geo.fold} position={[span / 2 + LIFT, top - fold / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            {material}
          </mesh>
          <mesh geometry={geo.fold} position={[-span / 2 - LIFT, top - fold / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
            {material}
          </mesh>
        </>
      )}
    </group>
  );
}

const MAILER_COLORS = ["#eeeeec", "#22242a", "#f3b4c6"];

/** The object itself (no tape), centred on the origin inside its `size` box. */
function Body({ kind, size, tint }: { kind: ItemKind; size: ItemSize; tint: number }) {
  const [L, H, D] = size;
  if (kind === "foam") {
    const lid = H * 0.24;
    return (
      <>
        <RoundedBox args={[L * 0.96, H - lid, D * 0.96]} radius={0.012} smoothness={3} position={[0, -lid / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={foamTexture()} roughness={1} />
        </RoundedBox>
        <RoundedBox args={[L, lid, D]} radius={0.012} smoothness={3} position={[0, H / 2 - lid / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={foamTexture()} roughness={1} />
        </RoundedBox>
      </>
    );
  }
  if (kind === "mailer") {
    return (
      <RoundedBox args={[L, H, D]} radius={H * 0.45} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={MAILER_COLORS[tint % MAILER_COLORS.length]} roughness={0.32} />
      </RoundedBox>
    );
  }
  if (kind === "bag") {
    return (
      <>
        <RoundedBox args={[L, H, D]} radius={0.006} smoothness={2} castShadow receiveShadow>
          <meshStandardMaterial color="#d9bb8e" map={kraftTexture()} roughness={0.9} />
        </RoundedBox>
        {/* folded-over top of the bag */}
        <mesh position={[0, H / 2 - 0.022, D / 2 + LIFT]}>
          <planeGeometry args={[L * 0.99, 0.044]} />
          <meshStandardMaterial color="#c9a877" map={kraftTexture()} roughness={0.9} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      </>
    );
  }
  if (kind === "cup") {
    const lid = H * 0.09;
    return (
      <>
        <mesh position={[0, -lid / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[L * 0.47, L * 0.33, H - lid, 40]} />
          <meshStandardMaterial color="#f7f6f2" roughness={0.55} />
        </mesh>
        <mesh position={[0, H / 2 - lid / 2, 0]} castShadow>
          <cylinderGeometry args={[L * 0.5, L * 0.5, lid, 40]} />
          <meshStandardMaterial color={tint % 2 ? "#17181c" : "#ffffff"} roughness={0.3} />
        </mesh>
      </>
    );
  }
  return (
    <>
      <RoundedBox args={[L, H, D]} radius={0.007} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial map={kraftTexture()} roughness={0.93} />
      </RoundedBox>
      {/* flap seam under the tape */}
      <mesh position={[0, H / 2 + LIFT / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L * 0.985, 0.004]} />
        <meshBasicMaterial color="#7a5530" polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </>
  );
}

/** Where the tape goes on each kind of object. */
function Tape({ kind, size, tape }: { kind: ItemKind; size: ItemSize; tape: Texture }) {
  const [L, H, D] = size;
  if (kind === "foam") {
    // a cross over the lid, both strips running down onto the body
    return (
      <>
        <TopStrip span={L} top={H / 2} fold={H * 0.5} tape={tape} />
        <TopStrip span={D} top={H / 2 + LIFT} fold={H * 0.5} tape={tape} turn />
      </>
    );
  }
  if (kind === "mailer") return <TopStrip span={L * 0.72} top={H / 2} fold={0} width={TAPE_W * 0.8} tape={tape} />;
  if (kind === "bag") return <TopStrip span={D} top={H / 2} fold={0.1} width={TAPE_W * 0.75} tape={tape} turn />;
  if (kind === "cup") return <TopStrip span={L} top={H / 2} fold={H * 0.3} width={L * 0.24} tape={tape} />;
  return <TopStrip span={L} top={H / 2} fold={0.085} tape={tape} />;
}

/**
 * One sealed object, centred on the origin. `tapeRef` receives the group holding the tape; it is
 * anchored at the left end, so scaling it on x from 0 to 1 lays the tape left to right.
 */
export function Item({
  kind,
  size,
  tape,
  tint = 0,
  withLabel = false,
  tapeRef,
}: {
  kind: ItemKind;
  size: ItemSize;
  tape: Texture | null;
  tint?: number;
  withLabel?: boolean;
  tapeRef?: (g: Group | null) => void;
}) {
  const [L, H, D] = size;
  const labelled = withLabel && (kind === "carton" || kind === "mailer");
  return (
    <group>
      <Body kind={kind} size={size} tint={tint} />
      {tape && (
        <group ref={tapeRef} position={[-L / 2, 0, 0]}>
          <group position={[L / 2, 0, 0]}>
            <Tape kind={kind} size={size} tape={tape} />
          </group>
        </group>
      )}
      {labelled && (
        <mesh position={[L * 0.2, H / 2 + LIFT, D / 2 - 0.062]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.13, 0.081]} />
          <meshStandardMaterial map={labelTexture()} roughness={0.8} polygonOffset polygonOffsetFactor={-4} />
        </mesh>
      )}
    </group>
  );
}
