// @vitest-environment node
// Real sharp encoders: the delivery photo must be a real, big enough, non-blank image, and the
// stored copy must carry no EXIF.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processDeliveryPhoto } from "./photo";

/** Pseudo-random RGB noise (deterministic), i.e. a "busy" real-looking frame. */
function noise(width: number, height: number, seed = 7): Buffer {
  const buf = Buffer.alloc(width * height * 3);
  let x = seed;
  for (let i = 0; i < buf.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    buf[i] = x & 255;
  }
  return buf;
}

const raw = (width: number, height: number, data: Buffer) => sharp(data, { raw: { width, height, channels: 3 } });
const flat = (width: number, height: number, v: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: v, g: v, b: v } } });

describe("processDeliveryPhoto", () => {
  it("accepts a real photo and re-encodes it as JPEG without EXIF", async () => {
    const input = await raw(1280, 960, noise(1280, 960))
      .withMetadata({ exif: { IFD0: { Make: "SpyCam", Model: "GPS-1" } } })
      .jpeg()
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const result = await processDeliveryPhoto(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meta = await sharp(result.jpeg).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    expect(result.jpeg.includes(Buffer.from("SpyCam"))).toBe(false);
  });

  it("accepts portrait photos and PNG input", async () => {
    const input = await raw(480, 640, noise(480, 640)).png().toBuffer();
    expect((await processDeliveryPhoto(input)).ok).toBe(true);
  });

  it("downscales very large photos", async () => {
    const input = await raw(3000, 2000, noise(3000, 2000)).jpeg().toBuffer();
    const result = await processDeliveryPhoto(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect((await sharp(result.jpeg).metadata()).width).toBe(2048);
  });

  it("rejects images under 640x480", async () => {
    const input = await raw(600, 480, noise(600, 480)).jpeg().toBuffer();
    expect(await processDeliveryPhoto(input)).toEqual({ ok: false, error: "too_small" });
  });

  it.each([
    ["black", 0],
    ["white", 255],
    ["grey", 128],
  ])("rejects a %s frame", async (_name, v) => {
    const input = await flat(1280, 960, v).jpeg().toBuffer();
    expect(await processDeliveryPhoto(input)).toEqual({ ok: false, error: "blank" });
  });

  it("rejects bytes that are not an image", async () => {
    expect(await processDeliveryPhoto(Buffer.from("not an image at all"))).toEqual({ ok: false, error: "not_image" });
    expect(await processDeliveryPhoto(Buffer.alloc(0))).toEqual({ ok: false, error: "not_image" });
  });

  it("rejects SVG (not a camera format)", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="960"><rect width="100%" height="100%" fill="red"/></svg>');
    expect(await processDeliveryPhoto(svg)).toEqual({ ok: false, error: "not_image" });
  });

  it("rejects a truncated JPEG", async () => {
    const input = await raw(1280, 960, noise(1280, 960)).jpeg().toBuffer();
    expect((await processDeliveryPhoto(input.subarray(0, 2000))).ok).toBe(false);
  });
});
