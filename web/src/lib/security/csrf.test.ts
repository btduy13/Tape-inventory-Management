import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./csrf";

const req = (method: string, headers: Record<string, string> = {}) =>
  new Request("https://app.example.com/api/leads", { method, headers });

describe("isSameOriginRequest", () => {
  it("allows safe methods without Origin", () => {
    expect(isSameOriginRequest(req("GET"))).toBe(true);
  });

  it("allows same-origin POST", () => {
    expect(isSameOriginRequest(req("POST", { origin: "https://app.example.com" }))).toBe(true);
  });

  it("allows configured site url origin", () => {
    const r = req("POST", { origin: "https://bangkeo.vn" });
    expect(isSameOriginRequest(r, "https://bangkeo.vn")).toBe(true);
  });

  it("blocks cross-site POST", () => {
    expect(isSameOriginRequest(req("POST", { origin: "https://evil.test" }))).toBe(false);
  });

  it("falls back to Referer and rejects when both missing", () => {
    expect(isSameOriginRequest(req("POST", { referer: "https://app.example.com/design" }))).toBe(true);
    expect(isSameOriginRequest(req("POST"))).toBe(false);
  });
});
