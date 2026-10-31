import { describe, expect, it } from "vitest";
import { validateUpload } from "./upload-validation";
import { MAX_FILE_BYTES } from "./api-contract";
import { JPEG_BYTES, PNG_BYTES, SVG_TEXT } from "../testing/fixtures";

const blob = (parts: BlobPart[], type = "") => new Blob(parts, { type });

describe("validateUpload", () => {
  it("treats missing / empty as no file", async () => {
    expect(await validateUpload(null, "logo")).toEqual({ ok: true, file: null });
    expect(await validateUpload(blob([]), "logo")).toEqual({ ok: true, file: null });
  });

  it("rejects strings where a file is expected", async () => {
    expect(await validateUpload("data:image/png;base64,xx", "logo")).toEqual({ ok: false, error: "file" });
  });

  it("uses magic bytes, not the declared type", async () => {
    const r = await validateUpload(blob([JPEG_BYTES], "image/png"), "logo");
    expect(r.ok && r.file?.contentType).toBe("image/jpeg");
    const fake = await validateUpload(blob(["GIF89a...."], "image/png"), "logo");
    expect(fake).toEqual({ ok: false, error: "file" });
  });

  it("enforces the 5MB cap", async () => {
    const big = new Uint8Array(MAX_FILE_BYTES + 1);
    big.set(PNG_BYTES);
    expect(await validateUpload(blob([big]), "logo")).toEqual({ ok: false, error: "too_large" });
  });

  it("sanitizes SVG logos", async () => {
    const r = await validateUpload(blob([SVG_TEXT.replace("<rect", "<script>x</script><rect")]), "logo");
    expect(r.ok).toBe(true);
    if (r.ok && r.file) {
      expect(r.file.contentType).toBe("image/svg+xml");
      expect(new TextDecoder().decode(r.file.bytes)).not.toContain("script");
    }
  });

  it("only accepts PNG for previews", async () => {
    expect((await validateUpload(blob([PNG_BYTES]), "preview")).ok).toBe(true);
    expect(await validateUpload(blob([SVG_TEXT]), "preview")).toEqual({ ok: false, error: "file" });
    expect(await validateUpload(blob([JPEG_BYTES]), "preview")).toEqual({ ok: false, error: "file" });
  });
});
