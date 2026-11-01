"use client";
// Client-only: draws a printed strip into a canvas and feeds it to the shared 3D mockup.
import { useState } from "react";
import { TapeMockup3D } from "@/features/mockup3d";
import { copyB } from "./copy";

const PX_PER_MM = 4;
const STRIP_LENGTH_MM = 300;
const WIDTH_MM = 48;
const PRESET = { width_mm: WIDTH_MM, length_m: 100, thickness_mic: 48 };

function drawStrip(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = STRIP_LENGTH_MM * PX_PER_MM;
  c.height = WIDTH_MM * PX_PER_MM;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = "#2b3fcf";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#f4f0e8";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(c.height * 0.36)}px "Segoe UI", Roboto, Arial, sans-serif`;
  const half = c.width / 2;
  for (let i = 0; i < 2; i++) {
    const x0 = i * half;
    // roll mark: ring + core
    const cx = x0 + c.height * 0.55;
    const cy = c.height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, c.height * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b3fcf";
    ctx.beginPath();
    ctx.arc(cx, cy, c.height * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f0e8";
    ctx.fillText(copyB.tapePrint, x0 + c.height * 0.95, cy + 2, half - c.height * 1.2);
  }
  return c;
}

export default function HeroMockup() {
  // Lazy initialiser runs only on the client (this module is loaded with ssr:false).
  const [source] = useState<HTMLCanvasElement | null>(() => (typeof document === "undefined" ? null : drawStrip()));
  return <TapeMockup3D source={source} version={1} preset={PRESET} stripLengthMm={STRIP_LENGTH_MM} initialView="carton" />;
}
