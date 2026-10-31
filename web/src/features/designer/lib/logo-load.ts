// Browser-side logo intake: validate -> sanitize SVG -> object URL -> natural size.
import { checkLogoBytes, logoMime } from "./logo-validate";
import { sanitizeSvg } from "./svg-sanitize";
import type { LogoAsset } from "./state";

export type LogoLoadResult = { ok: true; logo: LogoAsset } | { ok: false; error: "tooLarge" | "invalidType" | "empty" | "decode" };

export type ImageSizer = (url: string) => Promise<{ width: number; height: number }>;

/** Default sizer: decode via HTMLImageElement (img-src blob: is allowed by CSP). */
export const decodeImageSize: ImageSizer = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 150 });
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });

async function fileBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export async function loadLogoFile(file: File, sizer: ImageSizer = decodeImageSize): Promise<LogoLoadResult> {
  const bytes = await fileBytes(file);
  const check = checkLogoBytes(bytes, file.type, file.size);
  if (!check.ok) return check;

  let out: File = file;
  if (check.kind === "svg") {
    const clean = sanitizeSvg(new TextDecoder().decode(bytes));
    if (!clean) return { ok: false, error: "invalidType" };
    const name = file.name.replace(/\.[^.]*$/, "") || "logo";
    out = new File([clean], `${name}.svg`, { type: logoMime("svg") });
  }

  const url = URL.createObjectURL(out);
  try {
    const size = await sizer(url);
    if (!(size.width > 0 && size.height > 0)) throw new Error("decode");
    return { ok: true, logo: { file: out, kind: check.kind, url, width: size.width, height: size.height } };
  } catch {
    URL.revokeObjectURL(url);
    return { ok: false, error: "decode" };
  }
}
