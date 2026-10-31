// Registers a Unicode font with Vietnamese glyphs (built-in Helvetica has none).
// DejaVu Sans (Bitstream Vera / DejaVu license, see assets/fonts/LICENSE_DEJAVU.txt).
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const PDF_FONT_FAMILY = "DejaVuSans";
const FONT_DIR = path.join(process.cwd(), "src", "features", "quotes", "assets", "fonts");

let registered: string | null = null;

/** Returns the font family to use (falls back to Helvetica if the files are missing). */
export function ensurePdfFonts(): string {
  if (registered) return registered;
  const regular = path.join(FONT_DIR, "DejaVuSans.ttf");
  const bold = path.join(FONT_DIR, "DejaVuSans-Bold.ttf");
  if (!existsSync(regular)) {
    console.warn("[quotes:pdf] Vietnamese font missing, falling back to Helvetica");
    registered = "Helvetica";
    return registered;
  }
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: regular, fontWeight: "normal" },
      { src: existsSync(bold) ? bold : regular, fontWeight: "bold" },
    ],
  });
  // Vietnamese words must not be hyphenated with English rules.
  Font.registerHyphenationCallback((word) => [word]);
  registered = PDF_FONT_FAMILY;
  return registered;
}
