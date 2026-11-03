// Delivery photo check + clean-up (sharp). The photo is proof of delivery, so it must be a
// real decodable image, big enough, and not a flat/black/white frame. The stored copy is
// re-encoded: EXIF (GPS, device) and any trailing bytes are dropped.
import "server-only";
import sharp from "sharp";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MIN_LONG_EDGE = 640;
export const MIN_SHORT_EDGE = 480;
/** Grey-level standard deviation (0-255) below which a frame counts as blank. */
export const MIN_STDEV = 10;
const MAX_EDGE = 2048;
const MAX_INPUT_PIXELS = 50_000_000;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "heif"]);

export type PhotoError = "not_image" | "too_small" | "blank";
export type PhotoResult = { ok: true; jpeg: Buffer } | { ok: false; error: PhotoError };

const open = (input: Buffer) =>
  sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS, animated: false });

export async function processDeliveryPhoto(input: Buffer): Promise<PhotoResult> {
  let width: number;
  let height: number;
  try {
    const meta = await open(input).metadata();
    if (!meta.format || !ACCEPTED_FORMATS.has(meta.format) || !meta.width || !meta.height) {
      return { ok: false, error: "not_image" };
    }
    width = meta.width;
    height = meta.height;
  } catch {
    return { ok: false, error: "not_image" };
  }
  // Either orientation is fine (portrait phone photos).
  if (Math.max(width, height) < MIN_LONG_EDGE || Math.min(width, height) < MIN_SHORT_EDGE) {
    return { ok: false, error: "too_small" };
  }

  let jpeg: Buffer;
  let stdev: number;
  try {
    // rotate() applies the EXIF orientation; sharp drops all metadata unless asked to keep it.
    jpeg = await open(input)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const stats = await sharp(jpeg).resize(256, 256, { fit: "inside" }).greyscale().stats();
    stdev = stats.channels[0]?.stdev ?? 0;
  } catch {
    return { ok: false, error: "not_image" };
  }
  if (!(stdev >= MIN_STDEV)) return { ok: false, error: "blank" };
  return { ok: true, jpeg };
}
