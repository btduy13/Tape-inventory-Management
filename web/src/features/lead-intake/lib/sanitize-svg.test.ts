import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitize-svg";
import { SVG_TEXT } from "../testing/fixtures";

describe("sanitizeSvg", () => {
  it("keeps a plain vector logo", () => {
    const out = sanitizeSvg(SVG_TEXT);
    expect(out).toMatch(/^<svg/);
    expect(out).toContain("<rect");
    expect(out).toContain("viewBox=\"0 0 10 10\"");
    expect(out).toContain("width=\"10\"");
  });

  it("removes scripts, event handlers, foreignObject and style", () => {
    const evil =
      "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"><script>alert(2)</script>" +
      "<foreignObject><iframe src=\"https://x\"></iframe></foreignObject>" +
      "<style>@import url(https://evil)</style>" +
      "<rect onclick=\"x()\" style=\"fill:red\" width=\"1\" height=\"1\"/></svg>";
    const out = sanitizeSvg(evil)!;
    expect(out).not.toMatch(/script|onload|onclick|foreignObject|iframe|<style|style=|evil/i);
    expect(out).toContain("<rect");
  });

  it("drops javascript: and external hrefs, keeps internal #refs", () => {
    const svg =
      "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">" +
      "<defs><linearGradient id=\"g\"/></defs>" +
      "<a href=\"javascript:alert(1)\"><rect width=\"1\" height=\"1\"/></a>" +
      "<use xlink:href=\"https://evil.example/x.svg#a\"/><linearGradient id=\"h\" href=\"#g\"/>" +
      "<rect fill=\"url(https://evil.example/p)\" width=\"1\" height=\"1\"/></svg>";
    const out = sanitizeSvg(svg)!;
    expect(out).not.toMatch(/javascript|evil\.example/);
    expect(out).toContain("href=\"#g\"");
  });

  it("returns null when the root is not svg or nothing is left", () => {
    expect(sanitizeSvg("<script>alert(1)</script>")).toBeNull();
    expect(sanitizeSvg("<div>hi</div>")).toBeNull();
    expect(sanitizeSvg("")).toBeNull();
  });
});
