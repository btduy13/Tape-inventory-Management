// Variant "parcel wall" copy (Vietnamese) and tape looks. Only facts already stated on the live landing.
import type { ItemKind } from "./parcel-kit";
import type { TapeLook } from "./tape-art";

export const copyG = {
  heroWord: "BĂNG KEO",
  heroStageLabel: "Chữ BĂNG KEO được quấn băng keo in logo, xung quanh là thùng carton, thùng xốp, túi gói hàng, túi giấy và ly dán băng keo của nhiều thương hiệu",
  compareTitle: "Cùng một thùng hàng. Khác ở cái tên.",
  compareBody: "Kéo thanh trượt để so sánh băng keo trơn với băng keo in tên bạn.",
  comparePlain: "Băng keo trơn",
  comparePrinted: "Băng keo in logo",
  compareSlider: "So sánh băng keo trơn và băng keo in logo",
  usesPick: "Chọn một vật để xem thử",
  cupHint: "Kéo để xoay ly.",
  specs: "Khổ 12-80 mm. Cuộn 50-635 m. In tối đa 3 màu.",
} as const;

/** Unprinted packing tape for the compare slider: brown film, no print. */
export const PLAIN_TAPE: TapeLook = { bg: "rgba(176, 132, 78, 0.82)", fg: "#000000", accent: "#000000", mark: "ring" };

/**
 * How each product type is shown (keys match landing.productTypes): the film and print colours,
 * the thing it seals, and the sample shop name printed until the visitor types their own.
 */
export const TYPE_LOOKS: Record<string, TapeLook & { kind: ItemKind; sample: string }> = {
  // clear film: the carton shows through, only the print is solid
  clear: { kind: "carton", sample: "TRÀ SỮA MÂY", bg: "rgba(255, 255, 255, 0.3)", fg: "#cf1f27", accent: "#cf1f27", mark: "heart" },
  opaque: { kind: "foam", sample: "KHO 24H", bg: "#fef211", fg: "#1a1c4e", accent: "#fef211", mark: "star" },
  multi: { kind: "mailer", sample: "BẾP NHÀ LAN", bg: "#252a9a", fg: "#fef211", accent: "#ed3136", mark: "flower" },
};

/** What each use scene shows in the 3D stage (keys match landing.useScenes). */
export const USE_KINDS: Record<string, ItemKind> = { carton: "carton", cup: "cup", ecom: "mailer" };
