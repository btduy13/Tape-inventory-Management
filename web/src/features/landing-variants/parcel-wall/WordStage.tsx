"use client";
// Variant "parcel wall" hero scene. The word BĂNG KEO stands in the studio as solid letters (the
// page's own typeface, extruded). Two printed tapes weave through it, in front of one letter and
// behind the next, like the live site's hero but in real depth, and their prints keep running.
// Around the word, sealed things drop in: cartons, foam boxes, mailers, paper bags and cups, each
// with a different shop's tape. The camera follows the pointer a little and cranes up with the
// scroll. On a narrow (portrait) stage the two words stack. Transparent canvas (the studio backdrop
// is CSS). Client-only: load with next/dynamic ssr:false.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  PerspectiveCamera,
  ShapePath,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { installThreeConsoleFilter } from "@/features/mockup3d/lib/three-console";
import { CAP_HEIGHT, GLYPHS } from "./letters";
import { Item, STRIP_LEN, TAPE_W, useTapeTextures, type ItemKind, type ItemSize } from "./parcel-kit";

installThreeConsoleFilter();

/** World height of a capital letter (metres); everything else is sized against it. */
const CAP = 0.9;
const SCALE = CAP / CAP_HEIGHT;
/** Letter thickness, before the bevel. */
const DEPTH = 0.26;
const BEVEL = 0.014;
/** z of a letter's front face. */
const FACE = DEPTH / 2 + BEVEL;
/** Between two letters: wide enough for a tape to pass from the front to the back. */
const GAP = 0.17;
/** Between the two words. */
const SPACE = 0.44;
/** Between the two rows when the words are stacked. */
const ROW_GAP = 0.09;
/** Width of the tapes that weave through the word. */
const WEAVE_W = 0.2;
/** The things around the word are drawn a little larger than life, so their tapes can be read. */
const THING_SCALE = 1.3;
/** How far the tapes run past the word on each side (off screen). */
const TAIL = 7;
const FOV = 28;
/** Seconds a letter or object takes to land, and the height it falls from. */
const FALL = 0.72;
const DROP = 6;
const WORDS = [
  ["B", "Ă", "N", "G"],
  ["K", "E", "O"],
];

type Placed = { ch: string; x: number; y: number; w: number; index: number; order: number };
type Row = { y: number; letters: Placed[] };
type Plan = { rows: Row[]; width: number; height: number };

/** Where every letter stands: one row, or BĂNG on top of KEO on a narrow stage. */
function buildPlan(stacked: boolean): Plan {
  const lines = stacked ? WORDS : [[...WORDS[0], " ", ...WORDS[1]]];
  let index = 0;
  let width = 0;
  const rows = lines.map((line, r) => {
    const letters: Placed[] = [];
    let x = 0;
    for (const ch of line) {
      if (ch === " ") {
        x += SPACE - GAP;
        continue;
      }
      const w = (GLYPHS[ch].x1 - GLYPHS[ch].x0) * SCALE;
      letters.push({ ch, x, y: (lines.length - 1 - r) * (CAP + ROW_GAP), w, index: index++, order: 0 });
      x += w + GAP;
    }
    const total = x - GAP;
    for (const l of letters) l.x -= total / 2;
    width = Math.max(width, total);
    return { y: letters[0].y, letters };
  });
  // the bottom row lands first, left to right
  [...rows]
    .reverse()
    .flatMap((row) => row.letters)
    .forEach((l, i) => {
      l.order = i;
    });
  return { rows, width, height: rows.length * CAP + (rows.length - 1) * ROW_GAP };
}

const letterCache = new Map<string, ExtrudeGeometry>();
/** A letter as a solid: its outline (left edge at x = 0, baseline at y = 0) extruded and bevelled. */
function letterGeometry(ch: string): ExtrudeGeometry {
  const hit = letterCache.get(ch);
  if (hit) return hit;
  const glyph = GLYPHS[ch];
  const path = new ShapePath();
  for (const m of glyph.d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const n = m[2].split(" ").filter(Boolean).map(Number);
    const X = (i: number) => (n[i] - glyph.x0) * SCALE;
    const Y = (i: number) => n[i] * SCALE;
    if (m[1] === "M") path.moveTo(X(0), Y(1));
    else if (m[1] === "L") path.lineTo(X(0), Y(1));
    else if (m[1] === "Q") path.quadraticCurveTo(X(0), Y(1), X(2), Y(3));
    else if (m[1] === "C") path.bezierCurveTo(X(0), Y(1), X(2), Y(3), X(4), Y(5));
  }
  // toShapes() sorts out which contours are counters (holes) by containment
  const geometry = new ExtrudeGeometry(path.toShapes(), {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelOffset: -BEVEL,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -DEPTH / 2);
  letterCache.set(ch, geometry);
  return geometry;
}

/** 0..1: free fall, then one small rebound. */
function drop(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < 0.74) return (t / 0.74) ** 2;
  return 1 - 0.04 * Math.sin(((t - 0.74) / 0.26) * Math.PI);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Seconds since the opening started (a very large number when motion is off). The opening waits
 * for the page to be on screen: a tab opened in the background plays it when the visitor arrives.
 */
function useSceneTime(still: boolean) {
  const start = useRef<number | null>(null);
  return (elapsed: number) => {
    if (still) return 1e3;
    if (start.current === null) {
      if (document.visibilityState !== "visible") return 0;
      start.current = elapsed;
    }
    return elapsed - start.current;
  };
}

function Letters({ plan, still }: { plan: Plan; still: boolean }) {
  const groups = useRef<(Group | null)[]>([]);
  const time = useSceneTime(still);
  const letters = plan.rows.flatMap((row) => row.letters);
  useFrame((state) => {
    const t = time(state.clock.elapsedTime);
    letters.forEach((l, i) => {
      const g = groups.current[i];
      if (!g) return;
      const p = (t - l.order * 0.085) / FALL;
      g.position.y = l.y + (1 - drop(p)) * DROP;
      g.rotation.z = (l.order % 2 ? 0.16 : -0.16) * (1 - clamp01(p / 0.74));
    });
  });
  return (
    <>
      {letters.map((l, i) => (
        <group
          key={`${l.ch}${l.index}${plan.rows.length}`}
          ref={(g) => {
            groups.current[i] = g;
          }}
          position={[l.x, l.y + (still ? 0 : DROP), 0]}
        >
          <mesh geometry={letterGeometry(l.ch)} castShadow receiveShadow>
            <meshStandardMaterial color="#23278a" roughness={0.38} metalness={0.08} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/**
 * One tape through a row of letters, standing on its edge. `level` 0 is the upper tape, 1 the lower
 * one; the two take opposite sides of every letter, so each letter has one tape in front of it and
 * one behind. `height` is where its centre runs, as a fraction of the capital height.
 * z is a function of x: flat along a letter's face, an S-curve through the gap.
 */
function buildWeave(row: Row, level: 0 | 1, height: number): { geometry: BufferGeometry; xs: number[] } {
  const spans = row.letters.map((l) => ({ a: l.x - 0.02, b: l.x + l.w + 0.02, side: (l.index + level) % 2 === 0 ? 1 : -1 }));
  const first = spans[0];
  const last = spans[spans.length - 1];
  const off = FACE + 0.006;
  const zAt = (x: number): number => {
    // the tails drift away from the word a little, so the two tapes part ways
    if (x < first.a) return first.side * (off + (first.a - x) * 0.07);
    if (x > last.b) return last.side * (off + (x - last.b) * 0.07);
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i];
      if (x <= s.b) return s.side * off;
      const next = spans[i + 1];
      if (x < next.a) {
        const t = (x - s.b) / (next.a - s.b);
        return (s.side + (next.side - s.side) * t * t * (3 - 2 * t)) * off;
      }
    }
    return last.side * off;
  };
  const centre = row.y + CAP * height;
  const yAt = (x: number) => centre + 0.026 * Math.sin(x * 1.25 + level * 2.1 + row.y * 3);

  // dense samples through the word (the S-curves are tight), sparse ones along the tails
  const xs: number[] = [];
  for (let x = first.a - TAIL; x < first.a - 0.2; x += 0.1) xs.push(x);
  for (let x = first.a - 0.2; x < last.b + 0.2; x += 0.012) xs.push(x);
  for (let x = last.b + 0.2; x <= last.b + TAIL; x += 0.1) xs.push(x);

  const period = STRIP_LEN * (WEAVE_W / TAPE_W);
  const position: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  let length = 0;
  let px = 0;
  let py = 0;
  let pz = 0;
  xs.forEach((x, i) => {
    const y = yAt(x);
    const z = zAt(x);
    if (i > 0) length += Math.hypot(x - px, y - py, z - pz);
    px = x;
    py = y;
    pz = z;
    position.push(x, y - WEAVE_W / 2, z, x, y + WEAVE_W / 2, z);
    uv.push(length / period, 0, length / period, 1);
    if (i > 0) {
      const a = 2 * (i - 1);
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return { geometry, xs };
}

/** Draws the tape up to progress `p` (0..1), from the left end or (reverse) from the right end. */
function reveal(mesh: Mesh, xs: number[], p: number, reverse: boolean) {
  const segments = xs.length - 1;
  if (p >= 1) return mesh.geometry.setDrawRange(0, segments * 6);
  if (p <= 0) return mesh.geometry.setDrawRange(0, 0);
  const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
  const edge = reverse ? xs[segments] + (xs[0] - xs[segments]) * e : xs[0] + (xs[segments] - xs[0]) * e;
  let lo = 0;
  let hi = segments;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < edge) lo = mid + 1;
    else hi = mid;
  }
  if (reverse) mesh.geometry.setDrawRange(lo * 6, (segments - lo) * 6);
  else mesh.geometry.setDrawRange(0, lo * 6);
}

/** Moves the print along the tape by `du` (fraction of one canvas). */
function scrollPrint(mesh: Mesh, du: number) {
  const map = (mesh.material as MeshStandardMaterial).map;
  if (map) map.offset.x = (map.offset.x + du) % 1;
}

function Weaves({ plan, sources, version, still }: { plan: Plan; sources: readonly (HTMLCanvasElement | null)[]; version: number; still: boolean }) {
  const tapes = useMemo(() => {
    // Which print each tape carries: slot 0 is the visitor's own, slot 1 a sample shop.
    // One row: two tapes, an upper and a lower one. Stacked rows (small screens): one tape per
    // row through the middle, so the smaller letters stay easy to read.
    if (plan.rows.length > 1) {
      return plan.rows.map((row, r) => ({
        ...buildWeave(row, r === 0 ? 0 : 1, 0.5),
        slot: r,
        // after its row has landed (the bottom row lands first), from alternate sides
        start: r === 0 ? 1.25 : 0.95,
        reverse: r === 1,
      }));
    }
    return ([0, 1] as const).map((level) => ({
      ...buildWeave(plan.rows[0], level, level === 0 ? 0.64 : 0.28),
      slot: level,
      // after the letters have landed; the upper tape first, the lower one from the other side
      start: 0.95 + level * 0.25,
      reverse: level === 1,
    }));
  }, [plan]);
  useEffect(() => () => tapes.forEach((t) => t.geometry.dispose()), [tapes]);
  // a texture of its own per tape: each print runs at its own offset
  const prints = useMemo(() => tapes.map((t) => sources[t.slot] ?? null), [tapes, sources]);
  const textures = useTapeTextures(prints, version);
  const meshes = useRef<(Mesh | null)[]>([]);
  const time = useSceneTime(still);
  useFrame((state, dt) => {
    const t = time(state.clock.elapsedTime);
    tapes.forEach((tape, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      reveal(mesh, tape.xs, (t - tape.start) / 1.15, tape.reverse);
      if (!still) scrollPrint(mesh, (tape.reverse ? 1 : -1) * Math.min(dt, 0.05) * 0.16);
    });
  });
  return (
    <>
      {tapes.map((tape, i) => (
        <mesh
          key={`${plan.rows.length}-${i}`}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={tape.geometry}
          castShadow
        >
          <meshStandardMaterial map={textures[i]} side={DoubleSide} roughness={0.3} />
        </mesh>
      ))}
    </>
  );
}

type Thing = { kind: ItemKind; size: ItemSize; x: number; z: number; base: number; yaw: number; brand: number; tint: number; label: boolean };

const CUP: ItemSize = [0.16, 0.25, 0.16];

/**
 * The sealed things around the word, placed by hand so they flank it and never cover it.
 * `hw` is half the word's width. `base` lifts a thing onto the one listed just before it.
 */
function placeThings(stacked: boolean, hw: number): Thing[] {
  const at = (kind: ItemKind, size: ItemSize, x: number, z: number, yaw: number, brand: number, tint = 0, base = 0, label = false): Thing => ({
    kind,
    size,
    x,
    z,
    base,
    yaw,
    brand,
    tint,
    label,
  });
  // Sizes are before THING_SCALE; x / z are final. Tall things stay at z >= 1.3 so they never
  // cover the foot of the letters; low ones (mailers, cups) may come closer.
  if (stacked) {
    return [
      at("carton", [0.56, 0.3, 0.36], -1.2, 1.45, 0.22, 2, 0, 0, true),
      at("foam", [0.46, 0.3, 0.36], 1.2, 1.5, -0.2, 0),
      at("cup", CUP, 0.05, 1.2, 0, 5, 1),
      at("mailer", [0.44, 0.05, 0.3], -0.85, 2.45, 0.3, 1, 1, 0, true),
      at("cup", CUP, 0.15, 2.5, 0, 4, 0),
      at("bag", [0.28, 0.36, 0.13], 1.0, 2.5, -0.3, 5),
      at("carton", [0.58, 0.32, 0.4], -hw - 0.45, -1.0, 0.2, 4),
      at("foam", [0.46, 0.3, 0.36], hw + 0.45, -1.1, -0.2, 1),
    ];
  }
  return [
    // first row in front of the word: low things under it, a box at each end
    at("carton", [0.62, 0.34, 0.4], -3.3, 1.85, 0.24, 2, 0, 0, true),
    at("foam", [0.52, 0.34, 0.4], 3.3, 1.9, -0.28, 2),
    at("mailer", [0.46, 0.05, 0.32], -1.9, 1.25, 0.38, 1, 1, 0, true),
    at("mailer", [0.48, 0.05, 0.34], 1.45, 1.2, -0.3, 0, 2, 0, true),
    at("mailer", [0.42, 0.05, 0.3], -0.55, 1.2, 0.14, 3, 0, 0, true),
    at("cup", CUP, 0.5, 1.15, 0, 5, 1),
    at("cup", CUP, 2.4, 1.45, 0, 0, 1),
    // second row, nearer the camera: the tapes on these can be read
    at("foam", [0.5, 0.32, 0.38], -2.3, 2.5, -0.17, 0),
    at("carton", [0.56, 0.3, 0.36], 2.75, 2.6, 0.2, 5, 0, 0, true),
    at("bag", [0.28, 0.36, 0.13], -1.05, 2.4, 0.3, 5),
    at("bag", [0.28, 0.36, 0.13], 1.85, 2.35, -0.35, 1),
    at("cup", CUP, -0.3, 2.35, 0, 4, 0),
    at("carton", [0.5, 0.28, 0.34], 0.6, 2.5, 0.16, 4, 0, 0, true),
    // behind the two ends of the word
    at("carton", [0.58, 0.32, 0.4], -hw - 0.35, -1.3, -0.14, 0),
    at("carton", [0.5, 0.28, 0.36], -hw - 0.33, -1.3, 0.2, 2, 0, 0.32, true),
    at("carton", [0.6, 0.34, 0.4], hw + 0.4, -1.4, 0.17, 1),
    at("foam", [0.44, 0.3, 0.34], hw + 0.42, -1.4, -0.12, 5, 0, 0.34),
  ];
}

/**
 * Points that must stay in the frame: the corners of the word (with the breve over the Ă) and the
 * corners of every thing around it. The tape tails run off screen on purpose and are not included.
 */
function framePoints(plan: Plan, things: Thing[]): Vector3[] {
  const hw = plan.width / 2;
  const top = plan.height + CAP * 0.32;
  const points = [
    new Vector3(-hw, top, 0),
    new Vector3(hw, top, 0),
    new Vector3(-hw, 0, FACE),
    new Vector3(hw, 0, FACE),
  ];
  for (const t of things) {
    const r = (Math.hypot(t.size[0], t.size[2]) / 2) * THING_SCALE;
    const h = (t.base + t.size[1]) * THING_SCALE;
    for (const [dx, dz] of [
      [-r, 0],
      [r, 0],
      [0, r],
      [0, -r],
    ]) {
      points.push(new Vector3(t.x + dx, 0, t.z + dz), new Vector3(t.x + dx, h, t.z + dz));
    }
  }
  return points;
}

function Things({ things, stacked, sources, version, still }: { things: Thing[]; stacked: boolean; sources: readonly (HTMLCanvasElement | null)[]; version: number; still: boolean }) {
  const prints = useTapeTextures(sources, version);
  const groups = useRef<(Group | null)[]>([]);
  const seals = useRef<(Group | null)[]>([]);
  const time = useSceneTime(still);
  useFrame((state) => {
    const t = time(state.clock.elapsedTime);
    things.forEach((thing, i) => {
      // after the letters; a thing that sits on another one lands just after it
      const delay = 0.6 + i * 0.07 + (thing.base ? 0.2 : 0);
      const g = groups.current[i];
      if (g) {
        const p = (t - delay) / FALL;
        g.position.y = (thing.base + thing.size[1] / 2) * THING_SCALE + (1 - drop(p)) * DROP;
        g.rotation.z = (i % 2 ? 0.22 : -0.22) * (1 - clamp01(p / 0.74));
      }
      // the tape goes on the moment the thing has landed
      const seal = seals.current[i];
      if (seal) {
        const z = clamp01((t - delay - FALL) / 0.32);
        seal.visible = z > 0;
        seal.scale.x = Math.max(0.0001, 1 - (1 - z) ** 3);
      }
    });
  });
  return (
    <>
      {things.map((thing, i) => (
        <group
          key={`${stacked}-${i}`}
          ref={(g) => {
            groups.current[i] = g;
          }}
          position={[thing.x, (thing.base + thing.size[1] / 2) * THING_SCALE + (still ? 0 : DROP), thing.z]}
          rotation={[0, thing.yaw, 0]}
          scale={THING_SCALE}
        >
          <Item
            kind={thing.kind}
            size={thing.size}
            tape={prints[thing.brand % prints.length] ?? null}
            tint={thing.tint}
            withLabel={thing.label}
            tapeRef={(g) => {
              seals.current[i] = g;
            }}
          />
        </group>
      ))}
    </>
  );
}

/** Base camera pitch (radians above the horizon). */
const PITCH = 0.36;
/** Where the scene may sit in the frame (NDC): clear of the side edges and of the faded bottom. */
const FRAME_X = 0.94;
const FRAME_TOP = 0.92;
const FRAME_BOTTOM = -0.6;

/**
 * The smallest camera distance that keeps every frame point inside the frame, and the vertical
 * view offset (px) that then puts the scene in the band between FRAME_TOP and FRAME_BOTTOM.
 * Works for any stage size, so short wide screens (laptops) no longer crop the things.
 */
function fitCamera(points: Vector3[], lookAt: number, width: number, height: number): { distance: number; offsetY: number } {
  const cam = new PerspectiveCamera(FOV, width / Math.max(1, height), 0.1, 100);
  const v = new Vector3();
  const measure = (d: number) => {
    cam.position.set(0, lookAt + Math.sin(PITCH) * d, Math.cos(PITCH) * d);
    cam.lookAt(0, lookAt, 0);
    cam.updateMatrixWorld();
    let x = 0;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      v.copy(p).project(cam);
      x = Math.max(x, Math.abs(v.x));
      y0 = Math.min(y0, v.y);
      y1 = Math.max(y1, v.y);
    }
    return { x, y0, y1 };
  };
  let lo = 2;
  let hi = 60;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    const m = measure(mid);
    if (m.x <= FRAME_X && m.y1 - m.y0 <= FRAME_TOP - FRAME_BOTTOM) hi = mid;
    else lo = mid;
  }
  const m = measure(hi);
  // shift the picture so the scene's centre lands on the band's centre (offset y moves it up)
  const shift = (FRAME_TOP + FRAME_BOTTOM) / 2 - (m.y0 + m.y1) / 2;
  return { distance: hi, offsetY: (shift * height) / 2 };
}

/**
 * Camera: fitted so the word and every thing around it stay inside the frame (fitCamera), a little
 * above them. It sways slowly, leans toward the pointer, and cranes up as the page scrolls.
 */
function Rig({ plan, points, still }: { plan: Plan; points: Vector3[]; still: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const pointer = useRef({ x: 0, y: 0 });
  const lean = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);
  const lookAt = plan.height * 0.46;
  const fit = useMemo(() => fitCamera(points, lookAt, width, height), [points, lookAt, width, height]);
  useEffect(() => {
    camera.setViewOffset(width, height, 0, fit.offsetY, width, height);
    camera.updateProjectionMatrix();
  }, [camera, width, height, fit]);
  useFrame((state, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 3);
    lean.current.x += (pointer.current.x - lean.current.x) * k;
    lean.current.y += (pointer.current.y - lean.current.y) * k;
    const scroll = still ? 0 : clamp01(window.scrollY / 700);
    // scrolling away: the camera rises and pulls back, so the scene shrinks instead of crowding
    // the text under the stage
    const distance = fit.distance * (1 + scroll * 0.22);
    const yaw = still ? 0 : Math.sin(state.clock.elapsedTime * 0.25) * 0.035 + lean.current.x * 0.09;
    const pitch = PITCH + scroll * 0.12 - (still ? 0 : lean.current.y * 0.035);
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * distance, lookAt + Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance);
    camera.lookAt(0, lookAt, 0);
  });
  return null;
}

function Scene({ sources, version, still }: { sources: readonly (HTMLCanvasElement | null)[]; version: number; still: boolean }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const stacked = width / Math.max(1, height) < 1.25;
  const plan = useMemo(() => buildPlan(stacked), [stacked]);
  const things = useMemo(() => placeThings(stacked, plan.width / 2), [stacked, plan.width]);
  const points = useMemo(() => framePoints(plan, things), [plan, things]);
  return (
    <>
      <Letters plan={plan} still={still} />
      <Weaves plan={plan} sources={sources} version={version} still={still} />
      <Things things={things} stacked={stacked} sources={sources} version={version} still={still} />
      <Rig plan={plan} points={points} still={still} />
    </>
  );
}

export default function WordStage({
  sources,
  version,
  ariaLabel,
}: {
  /** Tape prints: slot 0 is the visitor's own, the rest are the sample shops. */
  sources: readonly (HTMLCanvasElement | null)[];
  version: number;
  ariaLabel: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0">
      <Canvas
        aria-label={ariaLabel}
        role="img"
        shadows="percentage"
        dpr={[1, 1.75]}
        frameloop={onScreen ? "always" : "demand"}
        camera={{ position: [0, 1.8, 8], fov: FOV, near: 0.5, far: 60 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[-4, 8, 6]}
          intensity={1.7}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-camera-near={1}
          shadow-camera-far={30}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[6, 4, 5]} intensity={0.5} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[10, 4, 1]} rotation={[-Math.PI / 2, 0, 0]} />
          <Lightformer form="rect" intensity={1.2} position={[-5, 1, 2]} scale={[2, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
          <Lightformer form="rect" intensity={0.9} position={[5, 1, 2]} scale={[2, 6, 1]} rotation={[0, -Math.PI / 2, 0]} />
        </Environment>
        <Scene sources={sources} version={version} still={still} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <shadowMaterial opacity={0.2} />
        </mesh>
      </Canvas>
    </div>
  );
}
