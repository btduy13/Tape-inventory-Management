// Variant D copy (Vietnamese). Only facts already stated on the live landing; no invented claims.
export const copyD = {
  h1a: "Băng keo in logo",
  h1b: "của bạn",
  lead: "Gõ tên thương hiệu, xem ngay trên thùng hàng. Sản xuất tại xưởng, báo giá trong ngày.",
  inputLabel: "Tên thương hiệu",
  inputPlaceholder: "Ví dụ: Trà Sữa Mây",
  comboLabel: "Màu băng keo",
  fallbackText: "LOGO CỦA BẠN",
  marquee: ["LOGO CỦA BẠN", "IN THEO YÊU CẦU", "KHỔ 12-80 MM", "CUỘN 50-635 M", "TỐI ĐA 3 MÀU"],
  specs: "Khổ 12-80 mm. Cuộn 50-635 m. Độ dày theo nhu cầu đóng gói.",
} as const;

export type Combo = { key: string; name: string; bg: string; fg: string; accent: string };

/** Tape colour ways built from the brand inks (logo red, yellow, navy) plus kraft. */
export const COMBOS: readonly Combo[] = [
  { key: "yellow", name: "Nền vàng, chữ xanh đậm", bg: "#fef211", fg: "#1a1c4e", accent: "#cf1f27" },
  { key: "white", name: "Nền trắng, chữ đỏ", bg: "#ffffff", fg: "#cf1f27", accent: "#1a1c4e" },
  { key: "blue", name: "Nền xanh, chữ trắng", bg: "#252a9a", fg: "#ffffff", accent: "#fef211" },
  { key: "kraft", name: "Nền nâu, chữ đen", bg: "#b8834f", fg: "#1c1712", accent: "#ffffff" },
];

export const MAX_BRAND_LENGTH = 28;
