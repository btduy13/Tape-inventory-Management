import { describe, expect, it, vi } from "vitest";
import { parseLeadResponse, submitLead } from "./submit-lead";
import { buildLeadFormData, EMPTY_LEAD_FORM } from "./build-form-data";
import { leadErrorMessage } from "./error-message";
import { DESIGN, PNG_BYTES } from "../testing/fixtures";

describe("buildLeadFormData", () => {
  it("serializes fields, token, design (logo.path cleared) and files", () => {
    const logo = new File([PNG_BYTES], "logo.png", { type: "image/png" });
    const fd = buildLeadFormData(
      { ...EMPTY_LEAD_FORM, name: "A", quantity: "10" },
      { designJson: { ...DESIGN, logo: { ...DESIGN.logo!, path: "x/y.png" } }, logoFile: logo, previewPng: new Blob([PNG_BYTES]) },
      "tok",
    );
    expect(fd.get("name")).toBe("A");
    expect(fd.get("turnstileToken")).toBe("tok");
    expect(JSON.parse(fd.get("design") as string).logo.path).toBeNull();
    expect(fd.get("logo")).toBeInstanceOf(Blob);
    expect(fd.get("preview")).toBeInstanceOf(Blob);
  });
});

describe("parseLeadResponse", () => {
  it("accepts well-formed bodies only", () => {
    expect(parseLeadResponse(201, { ok: true, code: "L1" })).toEqual({ ok: true, code: "L1" });
    expect(parseLeadResponse(422, { ok: false, error: "validation", fields: { phone: "x" } }))
      .toEqual({ ok: false, error: "validation", fields: { phone: "x" } });
    expect(parseLeadResponse(429, "nope")).toEqual({ ok: false, error: "rate_limited" });
    expect(parseLeadResponse(500, { ok: false, error: "<script>" })).toEqual({ ok: false, error: "server" });
  });
});

describe("submitLead", () => {
  it("maps network failures", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
    expect(await submitLead(new FormData(), fetchImpl)).toEqual({ ok: false, error: "network" });
  });

  it("posts to /api/leads", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true, code: "L2" }, { status: 201 })) as unknown as typeof fetch;
    expect(await submitLead(new FormData(), fetchImpl)).toEqual({ ok: true, code: "L2" });
    expect(vi.mocked(fetchImpl).mock.calls[0]![0]).toBe("/api/leads");
  });
});

describe("leadErrorMessage", () => {
  it("returns Vietnamese text for every code", () => {
    for (const c of ["csrf", "rate_limited", "captcha", "validation", "design", "file", "too_large", "server", "network"] as const) {
      expect(leadErrorMessage(c).length).toBeGreaterThan(5);
    }
  });
});
