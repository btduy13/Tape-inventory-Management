// Print facts staff need from a saved design: inks vs the 3-ink limit, tape colour, logo.
import type { Design } from "@/lib/types";

/** Mirrors features/designer MAX_COLORS (checked by a unit test; the designer bundle stays out of the portal). */
export const INK_LIMIT = 3;

export type InkSummary = {
  /** Distinct print inks as the designer counted them at submit time. */
  count: number;
  over: boolean;
  /** Ink swatches to show (hex). */
  inks: string[];
  /** Tape film colour (hex), when known. */
  tape: string | null;
  hasLogo: boolean;
};

const HEX = /^#[0-9a-f]{6}$/i;

export function inkSummary(design: Pick<Design, "colors" | "design_json" | "logo_path">): InkSummary {
  const dj = design.design_json ?? ({} as Partial<Design["design_json"]>);
  const fallback = [...new Set((design.colors ?? []).map((c) => c.toLowerCase()))];
  const inks = (dj.inkColors?.length ? dj.inkColors : fallback).filter((c) => HEX.test(c));
  const count = typeof dj.inkCount === "number" ? dj.inkCount : fallback.length;
  return {
    count,
    over: typeof dj.inkOverLimit === "boolean" ? dj.inkOverLimit : count > INK_LIMIT,
    inks,
    tape: dj.backgroundColor && HEX.test(dj.backgroundColor) ? dj.backgroundColor : null,
    hasLogo: !!(design.logo_path || dj.logo),
  };
}
