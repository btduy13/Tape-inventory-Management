import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath (open redirect guard)", () => {
  it("keeps same-site relative paths", () => {
    expect(safeNextPath("/portal/leads/123")).toBe("/portal/leads/123");
    expect(safeNextPath("/admin?tab=users#x")).toBe("/admin?tab=users#x");
  });

  it.each([
    "https://evil.test",
    "//evil.test/path",
    "/\\evil.test",
    "\\\\evil.test",
    "/%2F%2Fevil.test",
    "/%252F%252Fevil.test",
    "/%5Cevil.test",
    "javascript:alert(1)",
    "/\tevil",
    " /portal",
    "",
    "portal",
  ])("rejects %j", (input) => {
    expect(safeNextPath(input)).toBe("/portal");
  });

  it("rejects malformed encodings and non-strings", () => {
    expect(safeNextPath("/%E0%A4%A")).toBe("/portal");
    expect(safeNextPath(null)).toBe("/portal");
    expect(safeNextPath(undefined, "/")).toBe("/");
  });
});
