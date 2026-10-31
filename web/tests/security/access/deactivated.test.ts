// Rule: a deactivated account (profiles.is_active = false) cannot act, even with an access
// token issued before deactivation: no reads of its leads, no status change, no notes, no
// file downloads, no profile edits.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupLeads,
  createLead,
  createQuote,
  fixtureActor,
  looseService,
  setActive,
  uploadLogo,
} from "../helpers/lead-fixtures";
import type { Actor } from "../helpers/sessions";

let staff: Actor;
let manager: Actor;
let leadId: string;
let logoPath: string;

beforeAll(async () => {
  staff = await fixtureActor("access-inactive-staff", "staff");
  manager = await fixtureActor("access-inactive-manager", "manager");
  leadId = await createLead({ assignedTo: staff.id, tag: "inactive" });
  await createQuote(leadId);
  logoPath = await uploadLogo(leadId);
  // control while active
  expect((await staff.db.from("leads").select("id").eq("id", leadId)).data).toHaveLength(1);
  expect((await manager.db.from("leads").select("id").eq("id", leadId)).data).toHaveLength(1);
  await setActive(staff.id, false);
  await setActive(manager.id, false);
});

afterAll(async () => {
  await setActive(staff.id, true);
  await setActive(manager.id, true);
  await cleanupLeads([leadId]);
});

describe("deactivated staff with a still-valid token cannot act", () => {
  it("reads nothing of its assigned lead", async () => {
    for (const t of ["designs", "quotes", "lead_status_log", "lead_notes"]) {
      expect((await staff.db.from(t).select("*").eq("lead_id", leadId)).data ?? [], t).toEqual([]);
    }
    expect((await staff.db.from("leads").select("id").eq("id", leadId)).data ?? []).toEqual([]);
  });

  it("cannot change the lead status (RPC or direct update)", async () => {
    const rpc = await staff.db.rpc("change_lead_status", { p_lead_id: leadId, p_to: "consulting" });
    expect(rpc.error).not.toBeNull();
    await staff.db.from("leads").update({ status: "cancelled" }).eq("id", leadId);
    const { data } = await looseService().from("leads").select("status").eq("id", leadId).single();
    expect(data?.status).toBe("assigned");
  });

  it("cannot add an internal note", async () => {
    const { error } = await staff.db.from("lead_notes").insert({ lead_id: leadId, author_id: staff.id, body: "x" }).select("id");
    expect(error).not.toBeNull();
  });

  it("cannot download or list the lead's logo", async () => {
    const dl = await staff.db.storage.from("logos").download(logoPath);
    expect(dl.data).toBeNull();
    const ls = await staff.db.storage.from("logos").list(leadId);
    expect(ls.data ?? []).toEqual([]);
  });

  it("cannot edit its own profile", async () => {
    const marker = `inactive edit ${Date.now()}`;
    const before = (await looseService().from("profiles").select("*").eq("id", staff.id).single()).data;
    const res = await staff.db.from("profiles").update({ full_name: marker }).eq("id", staff.id).select("id");
    const after = (await looseService().from("profiles").select("*").eq("id", staff.id).single()).data;
    expect(res.data ?? [], "update reported affected rows").toEqual([]);
    expect(after).toEqual(before);
  });

  it("role helpers report no role", async () => {
    expect((await staff.db.rpc("is_internal")).data).toBe(false);
    expect((await staff.db.rpc("current_app_role")).data).toBeNull();
  });
});

describe("deactivated manager with a still-valid token cannot act", () => {
  it("reads no leads, quotes or profiles of others", async () => {
    expect((await manager.db.from("leads").select("id").eq("id", leadId)).data ?? []).toEqual([]);
    expect((await manager.db.from("quotes").select("id").eq("lead_id", leadId)).data ?? []).toEqual([]);
    const { data } = await manager.db.from("profiles").select("id");
    expect((data ?? []).map((p) => p.id).filter((id) => id !== manager.id)).toEqual([]);
  });

  it("cannot edit customer fields or create a quote", async () => {
    const before = (await looseService().from("leads").select("*").eq("id", leadId).single()).data;
    await manager.db.from("leads").update({ customer_note: "inactive manager" }).eq("id", leadId);
    const q = await manager.db.from("quotes").insert({ lead_id: leadId, version: 77 }).select("id");
    expect(q.error).not.toBeNull();
    expect((await looseService().from("leads").select("*").eq("id", leadId).single()).data).toEqual(before);
  });
});
