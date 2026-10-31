import { describe, expect, it, vi } from "vitest";
import { MAX_LOGO_BYTES } from "./constants";
import { loadLogoFile } from "./logo-load";
import { checkLogoBytes, sniffImageKind } from "./logo-validate";
import { sanitizeSvg } from "./svg-sanitize";

const enc = (s: string) => new TextEncoder().encode(s);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe("sniffImageKind / checkLogoBytes", () => {
  it("detects by magic bytes", () => {
    expect(sniffImageKind(PNG)).toBe("png");
    expect(sniffImageKind(JPG)).toBe("jpg");
    expect(sniffImageKind(enc('<?xml version="1.0"?>\n<!-- c --><svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe("svg");
    expect(sniffImageKind(enc("<html><svg/></html>"))).toBeNull();
    expect(sniffImageKind(enc("GIF89a"))).toBeNull();
  });
  it("enforces size and MIME agreement", () => {
    expect(checkLogoBytes(PNG, "image/png", 10)).toEqual({ ok: true, kind: "png" });
    expect(checkLogoBytes(PNG, "image/png", MAX_LOGO_BYTES + 1)).toEqual({ ok: false, error: "tooLarge" });
    expect(checkLogoBytes(PNG, "image/png", 0)).toEqual({ ok: false, error: "empty" });
    expect(checkLogoBytes(PNG, "image/svg+xml", 10)).toEqual({ ok: false, error: "invalidType" });
    expect(checkLogoBytes(JPG, "", 10)).toEqual({ ok: true, kind: "jpg" });
  });
});

describe("sanitizeSvg", () => {
  it("removes scripts, handlers, foreignObject and remote refs", () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script>' +
      '<foreignObject><iframe src="https://x"></iframe></foreignObject>' +
      '<image href="https://evil/x.png"/><use href="https://evil/s.svg#a"/>' +
      '<rect width="10" height="10" fill="url(https://evil/p)" style="fill:url(https://e)"/>' +
      '<circle r="3" fill="url(#g)"/></svg>';
    const clean = sanitizeSvg(dirty)!;
    expect(clean).toMatch(/^<svg/);
    for (const bad of ["script", "onload", "foreignObject", "iframe", "<image", "<use", "evil", "style="]) {
      expect(clean).not.toContain(bad);
    }
    expect(clean).toContain("url(#g)");
  });
  it("returns null for non-svg input", () => {
    expect(sanitizeSvg("")).toBeNull();
    expect(sanitizeSvg("<p>hi</p>")).toBeNull();
  });
});

describe("loadLogoFile", () => {
  it("sanitizes SVG before creating the asset", async () => {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:svg");
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>x()</script><rect width="1" height="1"/></svg>'], "logo.svg", { type: "image/svg+xml" });
    const res = await loadLogoFile(file, async () => ({ width: 100, height: 50 }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.logo.kind).toBe("svg");
    expect(await res.logo.file.text()).not.toContain("script");
    expect(res.logo.width).toBe(100);
    expect(create).toHaveBeenCalledOnce();
  });

  it("reports decode failures and revokes the URL", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:png");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const file = new File([PNG], "a.png", { type: "image/png" });
    const res = await loadLogoFile(file, async () => {
      throw new Error("x");
    });
    expect(res).toEqual({ ok: false, error: "decode" });
    expect(revoke).toHaveBeenCalledWith("blob:png");
  });

  it("rejects wrong types without creating URLs", async () => {
    const create = vi.spyOn(URL, "createObjectURL");
    const res = await loadLogoFile(new File(["GIF89a"], "a.gif", { type: "image/gif" }));
    expect(res).toEqual({ ok: false, error: "invalidType" });
    expect(create).not.toHaveBeenCalled();
  });
});
