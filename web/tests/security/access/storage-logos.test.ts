// Rule: logo objects of a lead (logos/<lead_id>/...) are not listable, downloadable or
// signable by unrelated accounts or anonymous callers, and nobody but admin/server writes them.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ANON_KEY, SUPABASE_URL } from "../helpers/env";
import { PNG_1PX, cleanupLeads, createLead, fixtureActor, looseService, uploadLogo } from "../helpers/lead-fixtures";
import { looseAnon, seedActor, type Actor, type LooseDb } from "../helpers/sessions";

let owner: Actor;
let leadId: string;
let logoPath: string;

beforeAll(async () => {
  owner = await fixtureActor("access-sto-owner", "staff");
  leadId = await createLead({ assignedTo: owner.id, tag: "storage" });
  logoPath = await uploadLogo(leadId);
});
afterAll(async () => cleanupLeads([leadId]));

async function outsiders(): Promise<Array<[string, LooseDb, string | null]>> {
  const s2 = await seedActor("staff2");
  const ctv = await seedActor("ctv");
  const staff = await seedActor("staff");
  return [
    ["anon", looseAnon(), null],
    ["staff2", s2.db, s2.token],
    ["ctv", ctv.db, ctv.token],
    ["staff", staff.db, staff.token],
  ];
}

describe("unrelated accounts and anonymous cannot reach a lead's logo", () => {
  it("owner can list and download (control)", async () => {
    expect((await owner.db.storage.from("logos").list(leadId)).data?.map((o) => o.name)).toContain("logo.png");
    expect((await owner.db.storage.from("logos").download(logoPath)).data).not.toBeNull();
  });

  it("list of <lead_id>/ and of the bucket root returns nothing", async () => {
    for (const [name, db] of await outsiders()) {
      expect((await db.storage.from("logos").list(leadId)).data ?? [], name).toEqual([]);
      const root = (await db.storage.from("logos").list("")).data ?? [];
      expect(root.map((o) => o.name), name).not.toContain(leadId);
    }
  });

  it("download is denied", async () => {
    for (const [name, db] of await outsiders()) {
      const { data } = await db.storage.from("logos").download(logoPath);
      expect(data, name).toBeNull();
    }
  });

  it("signed URL creation is denied", async () => {
    for (const [name, db] of await outsiders()) {
      const { data } = await db.storage.from("logos").createSignedUrl(logoPath, 60);
      expect(data?.signedUrl ?? null, name).toBeNull();
    }
  });

  it("public URL and raw object endpoints return no content", async () => {
    const pub = looseAnon().storage.from("logos").getPublicUrl(logoPath).data.publicUrl;
    expect((await fetch(pub)).ok).toBe(false);
    for (const [name, , token] of await outsiders()) {
      const headers: Record<string, string> = { apikey: ANON_KEY };
      if (token) headers.Authorization = `Bearer ${token}`;
      for (const p of [
        `logos/${logoPath}`,
        `authenticated/logos/${logoPath}`,
        `logos/${encodeURIComponent(logoPath)}`,
        `logos/x/../${logoPath}`,
      ]) {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${p}`, { headers });
        expect(res.status, `${name} ${p}`).toBeGreaterThanOrEqual(400);
      }
    }
  });

  it("storage.objects metadata is not readable through the search endpoint", async () => {
    for (const [name, db] of await outsiders()) {
      const { data } = await db.storage.from("logos").list(leadId, { search: "logo" });
      expect(data ?? [], name).toEqual([]);
    }
  });
});

describe("only admin / server write logo objects", () => {
  it("owner and outsiders cannot overwrite, upload or delete", async () => {
    const all: Array<[string, LooseDb]> = [["owner", owner.db], ...(await outsiders()).map(([n, d]) => [n, d] as [string, LooseDb])];
    for (const [name, db] of all) {
      const up = await db.storage.from("logos").upload(logoPath, PNG_1PX, { contentType: "image/png", upsert: true });
      expect(up.error, `${name} overwrite`).not.toBeNull();
      const add = await db.storage.from("logos").upload(`${leadId}/evil-${name}.png`, PNG_1PX, { contentType: "image/png" });
      expect(add.error, `${name} upload`).not.toBeNull();
      await db.storage.from("logos").remove([logoPath]);
    }
    const left = (await looseService().storage.from("logos").list(leadId)).data?.map((o) => o.name) ?? [];
    expect(left).toEqual(["logo.png"]);
  });

  it("manager (not admin) cannot upload through the browser API", async () => {
    const manager = await seedActor("manager");
    const up = await manager.db.storage.from("logos").upload(`${leadId}/manager.png`, PNG_1PX, { contentType: "image/png" });
    expect(up.error).not.toBeNull();
  });
});
