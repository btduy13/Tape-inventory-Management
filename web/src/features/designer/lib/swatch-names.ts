// Vietnamese names for the quick-pick swatches (labels / tooltips).
const NAMES: Record<string, string> = {
  "#ffffff": "Trắng",
  "#000000": "Đen",
  "#c8102e": "Đỏ",
  "#0033a0": "Xanh dương",
  "#007a33": "Xanh lá",
  "#ffcd00": "Vàng",
  "#ff6a13": "Cam",
  "#6d2077": "Tím",
  "#8b5a2b": "Nâu",
  "#d9c3a0": "Kraft (nâu nhạt)",
};

export function swatchName(hex: string): string {
  return NAMES[hex.toLowerCase()] ?? hex;
}
