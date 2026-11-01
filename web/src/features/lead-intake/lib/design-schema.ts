// Server-side validation of the submitted design (DesignJson in lib/types.ts).
// The schema itself is owned by features/designer (single source for limits); this file adds
// lead-intake rules: a tape width + length are required (designs.width_mm etc. are NOT NULL;
// save-lead.ts checks them against the active DB list / range) and logo.path is always reset
// (the server sets it after upload). presetId is ignored: sizes come from tape_widths (0022).
import { designJsonSchema } from "@/features/designer";
import type { DesignJson } from "@/lib/types";
import { MAX_DESIGN_JSON_CHARS } from "./api-contract";

export type ValidDesign = DesignJson & { presetId: null; widthMm: number; lengthM: number };

/** Parses the `design` multipart field. Returns null when missing or invalid. */
export function parseDesignJson(raw: unknown): ValidDesign | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_DESIGN_JSON_CHARS) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = designJsonSchema.safeParse(json);
  if (!parsed.success) return null;
  const d = parsed.data;
  if (d.widthMm === undefined || d.lengthM === undefined) return null;
  return {
    ...d,
    presetId: null,
    widthMm: d.widthMm,
    lengthM: d.lengthM,
    accentColor: d.accentColor ?? null,
    logo: d.logo ? { ...d.logo, path: null } : null,
  };
}

/** designs.colors (1..3 distinct, order: background, text, accent). */
export function designColors(d: Pick<DesignJson, "backgroundColor" | "textColor" | "accentColor">): string[] {
  const list = [d.backgroundColor, d.textColor, d.accentColor].filter(
    (c): c is string => typeof c === "string" && c.length > 0,
  );
  return [...new Set(list)].slice(0, 3);
}
