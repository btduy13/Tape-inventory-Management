import { describe, expect, it } from "vitest";
import { deliveryConfirmUrl } from "../lib/delivery";
import { qrSvg } from "./qr";

describe("delivery note QR", () => {
  it("encodes the absolute public confirm URL", () => {
    expect(deliveryConfirmUrl("https://bangkeo.vn", "abc_DEF-123")).toBe("https://bangkeo.vn/giao/abc_DEF-123");
    expect(deliveryConfirmUrl("http://localhost:3000/", "x")).toBe("http://localhost:3000/giao/x");
  });

  it("renders SVG markup without style attributes or scripts (nonce-only CSP)", async () => {
    const svg = await qrSvg("https://bangkeo.vn/giao/" + "A".repeat(43));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toMatch(/style=|<script|<style/i);
  });
});
