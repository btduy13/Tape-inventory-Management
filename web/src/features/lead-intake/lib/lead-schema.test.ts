import { describe, expect, it } from "vitest";
import { fieldErrors, leadFieldsSchema, normalizePhone } from "./lead-schema";
import { validFields } from "../testing/fixtures";

describe("leadFieldsSchema", () => {
  it("normalizes valid input", () => {
    const r = leadFieldsSchema.parse(validFields());
    expect(r).toEqual({
      name: "Nguyễn Văn A",
      phone: "0912345678",
      email: "a@example.vn",
      company: "Công ty ABC",
      quantity: 1000,
      note: "Cần gấp",
    });
  });

  it("maps empty optional fields to null", () => {
    const r = leadFieldsSchema.parse({ ...validFields(), email: " ", company: "", note: "" });
    expect(r.email).toBeNull();
    expect(r.company).toBeNull();
    expect(r.note).toBeNull();
  });

  it("strips control characters and collapses whitespace in single-line fields", () => {
    const r = leadFieldsSchema.parse({ ...validFields(), name: " A\u0000  B\u0007 " });
    expect(r.name).toBe("A B");
  });

  it.each([
    ["phone", "abc123456"],
    ["phone", "12345"],
    ["email", "not-an-email"],
    ["quantity", "0"],
    ["quantity", "1.5e3x"],
    ["quantity", "10000001"],
    ["name", ""],
    ["name", "x".repeat(121)],
    ["note", "x".repeat(2001)],
  ])("rejects invalid %s %j", (field, value) => {
    const r = leadFieldsSchema.safeParse({ ...validFields(), [field]: value });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error))).toContain(field);
  });

  it("accepts +84 international phone format", () => {
    expect(normalizePhone("+84 912.345-678")).toBe("+84912345678");
    expect(leadFieldsSchema.parse({ ...validFields(), phone: "+84 912 345 678" }).phone).toBe("+84912345678");
  });
});
