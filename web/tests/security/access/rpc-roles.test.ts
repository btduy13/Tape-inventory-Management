// Rule: every RPC enforces its role. Admin-only RPCs reject everyone else, server-only
// functions are not callable through the API at all, and the exposed RPC surface per role
// is exactly the reviewed allowlist.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ANON_KEY, SUPABASE_URL } from "../helpers/env";
import { cleanupLeads, createLead, fixtureActor, looseService } from "../helpers/lead-fixtures";
import { SEED_IDS, looseAnon, seedActor, type Actor, type LooseDb } from "../helpers/sessions";

let owner: Actor;
let leadId: string;

beforeAll(async () => {
  owner = await fixtureActor("access-rpc-owner", "staff");
  leadId = await createLead({ assignedTo: owner.id, tag: "rpc" });
});
afterAll(async () => cleanupLeads([leadId]));

async function lead() {
  const { data } = await looseService().from("leads").select("status, assigned_to, production_order_id").eq("id", leadId).single();
  return data;
}

async function nonAdmins(): Promise<Array<[string, LooseDb]>> {
  return [
    ["anon", looseAnon()],
    ["owner-staff", owner.db],
    ["staff2", (await seedActor("staff2")).db],
    ["ctv", (await seedActor("ctv")).db],
    ["manager", (await seedActor("manager")).db],
  ];
}

describe("assign_lead is admin-only", () => {
  it("every non-admin is rejected and the assignment is unchanged", async () => {
    const before = await lead();
    for (const [name, db] of await nonAdmins()) {
      const { error } = await db.rpc("assign_lead", { p_lead_id: leadId, p_user_id: SEED_IDS.staff2 });
      expect(error, name).not.toBeNull();
    }
    expect(await lead()).toEqual(before);
  });

  it("admin can assign (control) and the lead returns to the owner", async () => {
    const admin = await seedActor("admin");
    expect((await admin.db.rpc("assign_lead", { p_lead_id: leadId, p_user_id: SEED_IDS.staff2 })).error).toBeNull();
    expect((await lead())?.assigned_to).toBe(SEED_IDS.staff2);
    expect((await admin.db.rpc("assign_lead", { p_lead_id: leadId, p_user_id: owner.id })).error).toBeNull();
  });
});

describe("convert_lead_to_production: admin (or the assigned workshop user, see workshop/) only", () => {
  it("every non-admin is rejected and no production order is created", async () => {
    await looseService().from("leads").update({ status: "accepted" }).eq("id", leadId);
    for (const [name, db] of await nonAdmins()) {
      const due = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      const { error } = await db.rpc("convert_lead_to_production", { p_lead_id: leadId, p_due_date: due });
      expect(error, name).not.toBeNull();
    }
    expect((await lead())?.production_order_id).toBeNull();
    await looseService().from("leads").update({ status: "assigned" }).eq("id", leadId);
  });
});

describe("change_lead_status follows RLS and the staff transition rules", () => {
  it("staff2 and ctv cannot change the status of a lead they are not assigned to", async () => {
    const before = await lead();
    for (const role of ["staff2", "ctv"] as const) {
      const { error } = await (await seedActor(role)).db.rpc("change_lead_status", { p_lead_id: leadId, p_to: "cancelled" });
      expect(error, role).not.toBeNull();
    }
    const anon = await looseAnon().rpc("change_lead_status", { p_lead_id: leadId, p_to: "cancelled" });
    expect(anon.error).not.toBeNull();
    expect(await lead()).toEqual(before);
  });

  it("the owner cannot jump to a status reserved for the quote flow", async () => {
    const { error } = await owner.db.rpc("change_lead_status", { p_lead_id: leadId, p_to: "accepted" });
    expect(error?.code).toBe("42501");
    expect((await lead())?.status).toBe("assigned");
  });

  it("the owner can take an allowed step with a note (control)", async () => {
    const { error } = await owner.db.rpc("change_lead_status", { p_lead_id: leadId, p_to: "consulting", p_note: "rpc ok" });
    expect(error).toBeNull();
    expect((await lead())?.status).toBe("consulting");
  });
});

describe("server-only functions are not callable through the API", () => {
  const serverOnly: Array<[string, Record<string, unknown>]> = [
    ["quotes_recalc_totals", { p_quote_id: "00000000-0000-0000-0000-000000000000" }],
    ["check_rate_limit", { p_key: "sec-test", p_window_seconds: 60, p_max_hits: 1 }],
    ["next_bang_keo_in_order_id", {}],
    ["electron_app_purge_large_objects", {}],
  ];
  for (const [fn, args] of serverOnly) {
    it(`${fn}: rejected for anon, staff, manager and admin`, async () => {
      const dbs: Array<[string, LooseDb]> = [
        ["anon", looseAnon()],
        ["staff", owner.db],
        ["manager", (await seedActor("manager")).db],
        ["admin", (await seedActor("admin")).db],
      ];
      for (const [name, db] of dbs) {
        const { error } = await db.rpc(fn, args);
        expect(error, `${fn} as ${name}`).not.toBeNull();
      }
    });
  }

  it("is_service_call() is false for every signed-in role", async () => {
    for (const role of ["admin", "manager", "staff", "ctv"] as const) {
      const { data } = await (await seedActor(role)).db.rpc("is_service_call");
      expect(data, role).toBe(false);
    }
  });

  it("access helpers give staff2 no oracle for another staff's lead", async () => {
    const staff2 = (await seedActor("staff2")).db;
    expect((await staff2.rpc("can_access_lead", { p_lead_id: leadId })).data).toBe(false);
    expect((await staff2.rpc("is_staff_of", { p_lead_id: leadId })).data).toBe(false);
    expect((await staff2.rpc("can_access_lead_path", { p_name: `${leadId}/logo.png` })).data).toBe(false);
  });
});

describe("exposed RPC surface matches the reviewed allowlist", () => {
  const AUTH_ALLOWED = [
    "advance_production_step",
    "assign_lead",
    "assign_production_job",
    "can_access_lead",
    "can_access_lead_path",
    "change_lead_status",
    "convert_lead_to_production",
    "current_app_role",
    "is_admin",
    "is_internal",
    "is_manager_or_admin",
    "is_service_call",
    "is_staff_of",
    "is_workshop",
    "lead_transition_allowed",
    "workshop_jobs",
  ];
  const ANON_ALLOWED = ["lead_transition_allowed"];

  async function rpcPaths(bearer?: string): Promise<string[]> {
    const headers: Record<string, string> = { apikey: ANON_KEY, Accept: "application/openapi+json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
    const spec = (await res.json()) as { paths?: Record<string, unknown> };
    return Object.keys(spec.paths ?? {})
      .filter((p) => p.startsWith("/rpc/"))
      .map((p) => p.slice(5))
      .sort();
  }

  it("anon can execute only the pure transition helper", async () => {
    expect(await rpcPaths()).toEqual(ANON_ALLOWED);
  });

  it("authenticated users can execute only the reviewed RPCs", async () => {
    for (const actor of [owner, await seedActor("admin")]) {
      const paths = await rpcPaths(actor.token);
      for (const p of paths) expect(AUTH_ALLOWED, `${actor.name}: unexpected rpc ${p}`).toContain(p);
    }
  });
});
