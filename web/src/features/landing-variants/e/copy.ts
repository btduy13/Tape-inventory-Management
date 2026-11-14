// Variant E copy (Vietnamese). Only facts already stated on the live landing; no invented claims.
export const copyE = {
  heroLines: ["Băng keo", "in logo", "của bạn"],
  inputLabel: "Gõ tên thương hiệu của bạn",
  inputPlaceholder: "Ví dụ: Trà Sữa Mây",
  fallbackText: "LOGO CỦA BẠN",
  tryTitle: "Xem thử trên thùng hàng",
  tryBody: "Tên bạn vừa gõ đã nằm trên băng keo. Đổi màu, xoay thùng, hoặc xem trên ly và trên cuộn.",
  comboLabel: "Màu băng keo",
  marquee: ["LOGO CỦA BẠN", "IN THEO YÊU CẦU", "KHỔ 12-80 MM", "CUỘN 50-635 M", "TỐI ĐA 3 MÀU"],
  specs: "Khổ 12-80 mm. Cuộn 50-635 m. Độ dày theo nhu cầu đóng gói.",
  reviewLabel: "Kiểu hero",
} as const;

export type HeroKind = "word" | "live" | "strips";

/** Review routes for the three hero options (shown in the review bar). */
export const HERO_ROUTES: readonly { kind: HeroKind; href: string; label: string }[] = [
  { kind: "word", href: "/mau/e1", label: "Chữ lớn" },
  { kind: "live", href: "/mau/e2", label: "Chữ + 3D" },
  { kind: "strips", href: "/mau/e3", label: "Ba dải băng keo" },
];

export type Combo = { key: string; name: string; bg: string; fg: string; accent: string };

/** Tape colour ways built from the brand inks (logo red, yellow, navy) plus kraft. */
export const COMBOS: readonly Combo[] = [
  { key: "yellow", name: "Nền vàng, chữ xanh đậm", bg: "#fef211", fg: "#1a1c4e", accent: "#cf1f27" },
  { key: "white", name: "Nền trắng, chữ đỏ", bg: "#ffffff", fg: "#cf1f27", accent: "#1a1c4e" },
  { key: "blue", name: "Nền xanh, chữ trắng", bg: "#252a9a", fg: "#ffffff", accent: "#fef211" },
  { key: "kraft", name: "Nền nâu, chữ đen", bg: "#b8834f", fg: "#1c1712", accent: "#ffffff" },
];

/** Short enough to stay readable on the hero tape (one print repeat has a fixed length). */
export const MAX_BRAND_LENGTH = 20;
