// Variant C: tape data shared by the hero preview, the width picker and the scenes.

export const TAPE_WIDTHS_MM = [12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70, 80] as const;
export type TapeWidth = (typeof TAPE_WIDTHS_MM)[number];
export const DEFAULT_WIDTH: TapeWidth = 48;

export type Combo = {
  key: string;
  name: string;
  /** tape base colour */
  bg: string;
  /** print colour */
  fg: string;
  /** third print colour (separators) */
  accent: string;
};

export const COMBOS: readonly Combo[] = [
  { key: "amber", name: "Nền vàng, chữ đen", bg: "#f5a524", fg: "#17181c", accent: "#b4231a" },
  { key: "white", name: "Nền trắng, chữ đỏ", bg: "#f6f6f4", fg: "#c8241b", accent: "#17181c" },
  { key: "black", name: "Nền đen, chữ vàng", bg: "#30333a", fg: "#f5c518", accent: "#ffffff" },
  { key: "blue", name: "Nền xanh, chữ trắng", bg: "#1f4fd6", fg: "#ffffff", accent: "#ffd21f" },
  { key: "kraft", name: "Nền nâu, chữ đen", bg: "#b8834f", fg: "#1c1712", accent: "#f6f6f4" },
];

export const TAPE_FONT = '"Segoe UI Black", "Arial Black", "Segoe UI", Arial, sans-serif';
export const MAX_BRAND_LENGTH = 28;

/** Strip an id from React's useId() down to characters that are safe inside url(#...). */
export const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
