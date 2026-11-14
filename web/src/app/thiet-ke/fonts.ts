// Web fonts for the tape designer, self-hosted by next/font (downloaded at build time and served
// from /_next, so the font-src 'self' CSP holds and visitors never call Google). Only the
// designer page imports this file. preload: false: a font is fetched when the customer picks it
// (or its picker tile is shown), not up front. next/font needs literal options in every call.
// Ids must match FONT_FAMILIES (features/designer/lib/constants.ts); weights match FONT_META.
import {
  Anton, Baloo_2, Be_Vietnam_Pro, Bungee, Chakra_Petch, Dancing_Script, Lobster, Merriweather, Montserrat,
  Oswald, Pacifico, Patrick_Hand, Paytone_One, Playfair_Display, Roboto,
} from "next/font/google";

const beVietnamPro = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "800", variable: "--df-be-vietnam-pro" });
const montserrat = Montserrat({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "800", variable: "--df-montserrat" });
const roboto = Roboto({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "700", variable: "--df-roboto" });
const merriweather = Merriweather({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "700", variable: "--df-merriweather" });
const playfair = Playfair_Display({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "700", variable: "--df-playfair" });
const oswald = Oswald({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "700", variable: "--df-oswald" });
const anton = Anton({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "400", variable: "--df-anton" });
const paytone = Paytone_One({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "400", variable: "--df-paytone" });
const bungee = Bungee({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "400", variable: "--df-bungee" });
const chakra = Chakra_Petch({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "700", variable: "--df-chakra" });
const baloo = Baloo_2({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "800", variable: "--df-baloo" });
const lobster = Lobster({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "400", variable: "--df-lobster" });
const pacifico = Pacifico({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "400", variable: "--df-pacifico" });
const dancing = Dancing_Script({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "700", variable: "--df-dancing" });
const patrick = Patrick_Hand({ subsets: ["vietnamese", "latin"], display: "swap", preload: false, weight: "400", variable: "--df-patrick" });

const FONTS = {
  "Be Vietnam Pro": beVietnamPro,
  Montserrat: montserrat,
  Roboto: roboto,
  Merriweather: merriweather,
  "Playfair Display": playfair,
  Oswald: oswald,
  Anton: anton,
  "Paytone One": paytone,
  Bungee: bungee,
  "Chakra Petch": chakra,
  "Baloo 2": baloo,
  Lobster: lobster,
  Pacifico: pacifico,
  "Dancing Script": dancing,
  "Patrick Hand": patrick,
} as const;

/** Classes that declare the @font-face rules (CSS variables only: they do not change the page font). */
export const designerFontClasses = Object.values(FONTS).map((f) => f.variable).join(" ");

/** Font id -> generated CSS font-family, for <DesignProvider fonts>. */
export const designerFontFamilies: Record<string, string> = Object.fromEntries(
  Object.entries(FONTS).map(([id, f]) => [id, f.style.fontFamily]),
);
