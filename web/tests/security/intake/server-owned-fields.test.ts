// Rule: server-owned columns cannot be set by the public form (mass assignment).
import { afterAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  cleanupIntakeData,
  designOfLead,
  leadByCode,
  leadForm,
  pngFile,
  submitInProcess,
  validDesignJson,
} from "../helpers/intake";

afterAll(cleanupIntakeData);

const ADMIN_ID = "00000000-0000-0000-0000-00000000a001";
const FORGED_HASH = "f".repeat(64);

describe("intake server-owned fields: body values for lead columns are ignored", () => {
  it("assigned_to / status / source_ip_hash / code / id / timestamps from the body are not stored", async () => {
    const form = await leadForm({
      assigned_to: ADMIN_ID,
      assignedTo: ADMIN_ID,
      status: "won",
      source_ip_hash: FORGED_HASH,
      sourceIpHash: FORGED_HASH,
      code: "L-FORGED-1",
      id: "11111111-1111-4111-8111-111111111111",
      created_at: "2000-01-01T00:00:00Z",
      production_order_id: "99999",
      user_agent: "forged-ua",
    });
    const ip = "10.250.1.7";
    const r = await submitInProcess(form, { ip, headers: { "user-agent": "sectest-agent" } });
    expect(r.status, JSON.stringify(r.body)).toBe(201);

    const lead = (await leadByCode(r.body.code!)) as Record<string, unknown>;
    expect(lead.assigned_to).toBeNull();
    expect(lead.status).toBe("new");
    expect(lead.code).not.toBe("L-FORGED-1");
    expect(lead.id).not.toBe("11111111-1111-4111-8111-111111111111");
    expect(String(lead.created_at)).not.toMatch(/^2000-/);
    expect(lead.source_ip_hash).not.toBe(FORGED_HASH);
    const salt = process.env.IP_HASH_SALT ?? "";
    expect(lead.source_ip_hash).toBe(createHash("sha256").update(`${salt}:${ip}`).digest("hex"));
    expect(lead.user_agent).toBe("sectest-agent");
    if ("production_order_id" in lead) expect(lead.production_order_id).toBeNull();
  });
});

describe("intake server-owned fields: design JSON cannot pick the stored logo path", () => {
  it("design.logo.path from the body is replaced by the server path", async () => {
    const design = await validDesignJson({
      logo: { path: "00000000-0000-0000-0000-000000000000/stolen.png", scale: 1, offsetX: 0, offsetY: 0 },
    });
    const r = await submitInProcess(await leadForm({ design, logo: pngFile() }));
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const lead = await leadByCode(r.body.code!);
    const d = (await designOfLead(lead.id)) as Record<string, unknown>;
    const json = d.design_json as { logo?: { path?: string | null } };
    expect(json.logo?.path).toBe(d.logo_path);
    expect(String(d.logo_path)).toMatch(new RegExp(`^${lead.id}/`));
  });

  it("design.logo.path without an uploaded file is stored as null", async () => {
    const design = await validDesignJson({
      logo: { path: "../../previews/other-lead/preview.png", scale: 1, offsetX: 0, offsetY: 0 },
    });
    const r = await submitInProcess(await leadForm({ design }));
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const lead = await leadByCode(r.body.code!);
    const d = (await designOfLead(lead.id)) as Record<string, unknown>;
    expect(d.logo_path).toBeNull();
    expect((d.design_json as { logo?: { path?: string | null } }).logo?.path ?? null).toBeNull();
  });
});
