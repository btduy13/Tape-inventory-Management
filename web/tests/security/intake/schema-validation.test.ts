// Rule: the server-side schema rejects wrong types and overlong strings, and no control
// characters reach the stored lead (rejected with 422 or stripped before insert).
import { afterAll, describe, expect, it } from "vitest";
import {
  cleanupIntakeData,
  leadByCode,
  leadForm,
  leadsWithNameLike,
  submitInProcess,
  uniqueTag,
  validDesignJson,
} from "../helpers/intake";

afterAll(cleanupIntakeData);

async function expectRejected(overrides: Parameters<typeof leadForm>[0], status = 422) {
  const tag = uniqueTag();
  const r = await submitInProcess(await leadForm({ name: tag, ...overrides }));
  expect(r.status, JSON.stringify(r.body)).toBe(status);
  expect(r.body.ok).toBe(false);
  expect(await leadsWithNameLike(tag)).toHaveLength(0);
  return r;
}

describe("intake schema: wrong types are rejected", () => {
  for (const q of ["abc", "-5", "0", "1.5e3x", "1e9", "Infinity", "0x10", "1_000", " "]) {
    it(`quantity=${JSON.stringify(q)} -> 422`, async () => {
      await expectRejected({ quantity: q });
    });
  }

  it("phone with letters -> 422", async () => {
    await expectRejected({ phone: "09123abc78" });
  });

  it("email that is not an address -> 422", async () => {
    await expectRejected({ email: "not-an-email" });
  });

  it("email with CRLF header injection -> 422", async () => {
    await expectRejected({ email: "a@local.test\r\nBcc: victim@local.test" });
  });

  it("name sent as a file part -> 422 (required)", async () => {
    const r = await submitInProcess(await leadForm({ name: { bytes: "Mallory", name: "n.txt", type: "text/plain" } }));
    expect(r.status).toBe(422);
  });

  it("design that is not JSON -> 422", async () => {
    await expectRejected({ design: "{not json" });
  });

  it("design with a wrong-typed field -> 422", async () => {
    await expectRejected({ design: await validDesignJson({ fontSizePx: "40; drop table" }) });
  });

  it("logo sent as a string instead of a file -> rejected", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag, logo: "<svg onload=alert(1)>" }));
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });
});

describe("intake schema: overlong strings are rejected", () => {
  it("name 121 chars -> 422", async () => {
    const r = await submitInProcess(await leadForm({ name: `${uniqueTag()}${"N".repeat(121)}` }));
    expect(r.status).toBe(422);
    expect(r.body.fields?.name).toBeTruthy();
  });

  it("company 201 chars -> 422", async () => {
    await expectRejected({ company: "C".repeat(201) });
  });

  it("note 2001 chars -> 422", async () => {
    await expectRejected({ note: "x".repeat(2001) });
  });

  it("email 255+ chars -> 422", async () => {
    await expectRejected({ email: `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.vn` });
  });

  it("phone 16 digits -> 422", async () => {
    await expectRejected({ phone: "1234567890123456" });
  });

  it("design JSON over 20000 chars -> 422", async () => {
    await expectRejected({ design: await validDesignJson({ text: "T".repeat(25_000) }) });
  });
});

describe("intake schema: control characters never reach the stored lead", () => {
  // C0/C1 controls (except tab/newline in the note), plus bidi overrides/isolates that spoof
  // how names render in the staff UI and emails (Trojan-Source style).
  const FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‪-‮⁦-⁩]/;

  const cases: [string, Record<string, string>][] = [
    ["NUL in name", { name: "A\u0000B" }],
    ["ANSI escape in name", { name: "\u001b[31mRED\u001b[0m" }],
    ["C1 control in company", { company: "Cty\u0085ABC" }],
    ["BEL/ESC in note", { note: "line1\u0007\u001b]0;pwn\u0007" }],
    ["RTL override in name", { name: "Invoice‮gnp.exe" }],
    ["bidi isolate in company", { company: "⁧ABC⁩" }],
  ];

  for (const [label, fields] of cases) {
    it(`${label}: rejected or stripped`, async () => {
      const tag = uniqueTag();
      const name = fields.name !== undefined ? `${tag} ${fields.name}` : tag;
      const r = await submitInProcess(await leadForm({ ...fields, name }));
      if (r.status === 422) {
        expect(await leadsWithNameLike(tag)).toHaveLength(0);
        return;
      }
      expect(r.status).toBe(201);
      const lead = await leadByCode(r.body.code!);
      for (const col of ["customer_name", "company", "customer_note", "email", "phone"] as const) {
        const v = (lead as Record<string, unknown>)[col];
        if (typeof v === "string") expect(FORBIDDEN.test(v), `${col}=${JSON.stringify(v)}`).toBe(false);
      }
    });
  }
});
