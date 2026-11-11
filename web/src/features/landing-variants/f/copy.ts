// Variant F copy (Vietnamese). Only facts already stated on the live landing; no invented claims.
export const copyF = {
  h1a: "Băng keo in logo.",
  h1b: "Mang tên bạn đến từng thùng hàng.",
  lead: "In theo thiết kế của bạn, tối đa 3 màu. Sản xuất tại xưởng, báo giá trong ngày làm việc.",
  inputLabel: "Gõ tên thương hiệu để xem thử",
  inputPlaceholder: "Ví dụ: Trà Sữa Mây",
  fallbackText: "LOGO CỦA BẠN",
  comboLabel: "Màu băng keo",
  heroStageLabel: "Cuộn băng keo in tên thương hiệu của bạn",
  viewerTitle: "Xem trên thùng hàng của bạn",
  viewerBody: "Kéo để xoay. Đổi màu băng keo, hoặc xem trên ly và trên cuộn.",
  viewerTabs: "Vật dán thử",
  specs: [
    { value: "12-80", unit: "mm", label: "Khổ băng keo" },
    { value: "50-635", unit: "m", label: "Chiều dài cuộn" },
    { value: "3", unit: "màu", label: "In tối đa" },
  ],
} as const;

export type Combo = { key: string; name: string; bg: string; fg: string; accent: string; edge?: string };

/** Tape colour ways for the hero roll and the viewer. */
export const COMBOS: readonly Combo[] = [
  { key: "yellow", name: "Nền vàng, chữ xanh đậm", bg: "#fef211", fg: "#1a1c4e", accent: "#cf1f27", edge: "#fef211" },
  { key: "white", name: "Nền trắng, chữ đỏ", bg: "#ffffff", fg: "#cf1f27", accent: "#1a1c4e", edge: "#f4f4f2" },
  { key: "blue", name: "Nền xanh, chữ trắng", bg: "#252a9a", fg: "#ffffff", accent: "#fef211", edge: "#252a9a" },
  { key: "kraft", name: "Nền nâu, chữ đen", bg: "#b8834f", fg: "#1c1712", accent: "#ffffff", edge: "#b8834f" },
];

/** How each product type is drawn on its roll (keys match landing.productTypes). */
export const PRODUCT_LOOKS: Record<string, Combo> = {
  // clear film over the kraft core reads as a warm translucent tan
  clear: { key: "clear", name: "", bg: "#dcc69f", fg: "#cf1f27", accent: "#cf1f27" },
  opaque: { key: "opaque", name: "", bg: "#fef211", fg: "#1a1c4e", accent: "#cf1f27", edge: "#fef211" },
  multi: { key: "multi", name: "", bg: "#252a9a", fg: "#fef211", accent: "#ed3136", edge: "#252a9a" },
};

export const MAX_BRAND_LENGTH = 24;
