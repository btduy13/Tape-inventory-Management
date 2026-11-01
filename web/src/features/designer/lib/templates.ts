// Starter samples for the designer (applied with the "applyTemplate" action).
import type { DesignTemplate } from "./state";

export const DESIGN_TEMPLATES: readonly (DesignTemplate & { label: string })[] = [
  { id: "kraft-red", label: "Kraft - chữ đỏ", backgroundColor: "#d9c3a0", textColor: "#cf1f27", text: "TÊN CÔNG TY", fontFamily: "Arial" },
  { id: "fragile", label: "Hàng dễ vỡ", backgroundColor: "#ffcd00", textColor: "#000000", text: "HÀNG DỄ VỠ - XIN NHẸ TAY", fontFamily: "Arial" },
  { id: "white-blue", label: "Trắng - chữ xanh", backgroundColor: "#ffffff", textColor: "#0033a0", text: "CẢM ƠN QUÝ KHÁCH", fontFamily: "Tahoma" },
  { id: "hotline", label: "Hotline", backgroundColor: "#000000", textColor: "#ffffff", text: "HOTLINE 0901 234 567", fontFamily: "Verdana" },
];
