import { describe, expect, it } from "vitest";
import { looksLikeSvg, sniffImageType } from "./file-sniff";
import { JPEG_BYTES, PNG_BYTES, SVG_TEXT } from "../testing/fixtures";

const enc = (s: string) => new TextEncoder().encode(s);

describe("sniffImageType", () => {
  it("detects PNG, JPEG and SVG by content", () => {
    expect(sniffImageType(PNG_BYTES)).toBe("image/png");
    expect(sniffImageType(JPEG_BYTES)).toBe("image/jpeg");
    expect(sniffImageType(enc(SVG_TEXT))).toBe("image/svg+xml");
  });

  it("accepts SVG with BOM, XML prolog, comment and doctype", () => {
    const svg =
      "﻿<?xml version=\"1.0\"?>\n<!-- logo -->\n" +
      "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"x.dtd\">\n" +
      SVG_TEXT;
    expect(looksLikeSvg(enc(svg))).toBe(true);
  });

  it("rejects HTML, GIF, PDF, empty and binary-with-nulls", () => {
    expect(sniffImageType(enc("<html><svg></svg></html>"))).toBeNull();
    expect(sniffImageType(enc("GIF89a"))).toBeNull();
    expect(sniffImageType(enc("%PDF-1.7"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
    expect(sniffImageType(new Uint8Array([0x3c, 0, 0x73, 0]))).toBeNull();
  });
});
