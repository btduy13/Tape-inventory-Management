// Rule: the stored file type comes from the content (magic bytes), never from the declared
// MIME type or file name; content that is not an allowed image is rejected.
import { afterAll, describe, expect, it } from "vitest";
import { JPEG_BYTES, PNG_BYTES } from "@/features/lead-intake/testing/fixtures";
import {
  cleanupIntakeData,
  designOfLead,
  leadByCode,
  leadForm,
  leadsWithNameLike,
  storedObjects,
  submitInProcess,
  uniqueTag,
  type FileSpec,
} from "../helpers/intake";

afterAll(cleanupIntakeData);

const HTML = "<!doctype html><html><body><script>alert(document.cookie)</script></body></html>";
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0]);
const PDF = "%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';

async function expectFileRejected(field: "logo" | "preview", file: FileSpec) {
  const tag = uniqueTag();
  const r = await submitInProcess(await leadForm({ name: tag, [field]: file }));
  expect(r.status, JSON.stringify(r.body)).toBe(415);
  expect(r.body.error).toBe("file");
  expect(await leadsWithNameLike(tag)).toHaveLength(0);
}

describe("intake upload type: content that does not match an allowed image type is rejected", () => {
  it("HTML declared as image/png (logo.png) -> 415", async () => {
    await expectFileRejected("logo", { bytes: HTML, name: "logo.png", type: "image/png" });
  });
  it("HTML declared as image/svg+xml -> 415", async () => {
    await expectFileRejected("logo", { bytes: HTML, name: "logo.svg", type: "image/svg+xml" });
  });
  it("GIF declared as image/jpeg -> 415", async () => {
    await expectFileRejected("logo", { bytes: GIF, name: "logo.jpg", type: "image/jpeg" });
  });
  it("PDF declared as image/png -> 415", async () => {
    await expectFileRejected("logo", { bytes: PDF, name: "logo.png", type: "image/png" });
  });
  it("UTF-16 encoded SVG -> 415", async () => {
    const u16 = new Uint8Array([0xff, 0xfe, ...Array.from(SVG).flatMap((c) => [c.charCodeAt(0), 0])]);
    await expectFileRejected("logo", { bytes: u16, name: "logo.svg", type: "image/svg+xml" });
  });
  it("preview must be PNG: SVG preview -> 415", async () => {
    await expectFileRejected("preview", { bytes: SVG, name: "preview.png", type: "image/png" });
  });
  it("preview must be PNG: JPEG preview -> 415", async () => {
    await expectFileRejected("preview", { bytes: JPEG_BYTES, name: "preview.png", type: "image/png" });
  });
});

describe("intake upload type: declared MIME / extension never decide the stored type", () => {
  it("PNG bytes declared as text/html (evil.html) are stored as image/png with .png extension", async () => {
    const r = await submitInProcess(await leadForm({ logo: { bytes: PNG_BYTES, name: "evil.html", type: "text/html" } }));
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const lead = await leadByCode(r.body.code!);
    const design = await designOfLead(lead.id);
    expect(design.logo_path).toMatch(/\.png$/);
    const objs = await storedObjects("logos", lead.id);
    expect(objs).toHaveLength(1);
    expect(objs[0]!.mimetype).toBe("image/png");
  });

  it("JPEG bytes declared as image/svg+xml are stored as image/jpeg", async () => {
    const r = await submitInProcess(await leadForm({ logo: { bytes: JPEG_BYTES, name: "x.svg", type: "image/svg+xml" } }));
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const lead = await leadByCode(r.body.code!);
    const objs = await storedObjects("logos", lead.id);
    expect(objs[0]!.mimetype).toBe("image/jpeg");
    expect(objs[0]!.path).toMatch(/\.jpg$/);
  });
});
