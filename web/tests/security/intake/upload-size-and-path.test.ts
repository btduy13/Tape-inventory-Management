// Rules: files over 5 MB are rejected; client file names never influence storage paths.
import { afterAll, describe, expect, it } from "vitest";
import { PNG_BYTES } from "@/features/lead-intake/testing/fixtures";
import {
  cleanupIntakeData,
  designOfLead,
  leadByCode,
  leadForm,
  leadsWithNameLike,
  MB,
  storedObjects,
  submitInProcess,
  uniqueTag,
} from "../helpers/intake";

afterAll(cleanupIntakeData);

function bigPng(size: number): Uint8Array {
  const b = new Uint8Array(size);
  b.set(PNG_BYTES);
  return b;
}

describe("intake upload size: files above 5 MB are rejected", () => {
  it("logo of 5 MB + 1 byte -> 413, nothing stored", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag, logo: { bytes: bigPng(5 * MB + 1), name: "l.png", type: "image/png" } }));
    expect(r.status).toBe(413);
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });

  it("preview of 5 MB + 1 byte -> 413, nothing stored", async () => {
    const tag = uniqueTag();
    const r = await submitInProcess(await leadForm({ name: tag, preview: { bytes: bigPng(5 * MB + 1), name: "p.png", type: "image/png" } }));
    expect(r.status).toBe(413);
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });
});

describe("intake upload path: file names cannot influence storage paths", () => {
  const NAMES = [
    "../../../previews/victim/preview.png",
    "..\\..\\logos\\x.png",
    "%2e%2e%2f%2e%2e%2fescape.png",
    "/etc/passwd",
    "a\u0000b.png",
    "<script>.png",
    "00000000-0000-0000-0000-000000000000/owned.png",
  ];
  for (const name of NAMES) {
    it(`name ${JSON.stringify(name)} -> path is <lead_id>/logo-<random>.png`, async () => {
      const r = await submitInProcess(
        await leadForm({ logo: { bytes: PNG_BYTES, name, type: "image/png" }, preview: { bytes: PNG_BYTES, name, type: "image/png" } }),
      );
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      const lead = await leadByCode(r.body.code!);
      const d = await designOfLead(lead.id);
      expect(d.logo_path).toMatch(new RegExp(`^${lead.id}/logo-[A-Za-z0-9_-]{8,}\\.png$`));
      expect(d.preview_path).toMatch(new RegExp(`^${lead.id}/preview-[A-Za-z0-9_-]{8,}\\.png$`));
      const stem = name.replace(/\.png$/, "").split(/[\\/]/).pop()!;
      // The regexes above already pin the shape; a stem this short can occur in the random part by chance.
      if (stem.length >= 4) expect(d.logo_path).not.toContain(stem);
      const logos = await storedObjects("logos", lead.id);
      const previews = await storedObjects("previews", lead.id);
      expect(logos.map((o) => o.path)).toEqual([d.logo_path]);
      expect(previews.map((o) => o.path)).toEqual([d.preview_path]);
    });
  }

  it("two uploads of the same file name get different paths (no overwrite)", async () => {
    const a = await submitInProcess(await leadForm({ logo: { bytes: PNG_BYTES, name: "same.png", type: "image/png" } }));
    const b = await submitInProcess(await leadForm({ logo: { bytes: PNG_BYTES, name: "same.png", type: "image/png" } }));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const da = await designOfLead((await leadByCode(a.body.code!)).id);
    const db = await designOfLead((await leadByCode(b.body.code!)).id);
    expect(da.logo_path).not.toBe(db.logo_path);
  });
});
