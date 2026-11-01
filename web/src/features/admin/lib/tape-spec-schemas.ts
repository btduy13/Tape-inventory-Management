// zod schemas for the tape size admin page (tape_widths / tape_spec_settings, 0022).
import { z } from "zod";

const uuid = z.guid();

/** New width: whole millimetres (tape_widths.width_mm integer 1..200). */
export const addWidthSchema = z.object({
  widthMm: z.coerce.number().int().min(1).max(200),
});
export type AddWidthInput = z.infer<typeof addWidthSchema>;

export const widthIdSchema = z.object({ id: uuid });

export const toggleWidthSchema = z.object({
  id: uuid,
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});
export type ToggleWidthInput = z.infer<typeof toggleWidthSchema>;

export const moveWidthSchema = z.object({
  id: uuid,
  direction: z.enum(["up", "down"]),
});
export type MoveWidthInput = z.infer<typeof moveWidthSchema>;

/** numeric(_, 1) columns: rounded to one decimal, must stay > 0 after rounding. */
const decimal = (max: number) =>
  z.coerce.number().finite().min(0.1).max(max).transform((v) => Math.round(v * 10) / 10);

export const lengthLimitsSchema = z
  .object({
    minLengthM: decimal(10000),
    maxLengthM: decimal(10000),
    thicknessMic: decimal(200),
  })
  .refine((v) => v.minLengthM <= v.maxLengthM, { message: "range", path: ["maxLengthM"] });
export type LengthLimitsInput = z.infer<typeof lengthLimitsSchema>;

/** Swap with the neighbour, then renumber 10, 20, 30… so equal sort_order values stop mattering. */
export function reorderWidths<T extends { id: string }>(rows: readonly T[], id: string, direction: "up" | "down"): T[] | null {
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return null;
  const out = [...rows];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}

/** Next sort_order for a new width: after the last one. */
export function nextSortOrder(rows: readonly { sort_order: number }[]): number {
  return rows.reduce((m, r) => Math.max(m, r.sort_order), 0) + 10;
}
