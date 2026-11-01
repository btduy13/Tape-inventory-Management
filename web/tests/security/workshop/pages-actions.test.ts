// Rule: /portal/xuong is for admin + workshop only; workshop users cannot open the lead portal or
// admin pages; workshop Server Actions refuse other roles before any write.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads } from "../helpers/lead-fixtures";
import { SEED_IDS } from "../helpers/sessions";
import { ACTIONS, actionResult, appSession, callAction, webFetch } from "../helpers/web";
import { assignJob, cleanupOrders, createAcceptedLead } from "../helpers/workshop";

const FORBIDDEN = "Bạn không có quyền thực hiện thao tác này.";
const LEAD = "00000000-0000-0000-0000-0000000b0001";

const cookies: Record<string, string> = {};
let jobLead: string;
let jobId: string;
beforeAll(async () => {
  for (const email of ["workshop@local.test", "workshop2@local.test", "staff@local.test", "manager@local.test", "admin@local.test"]) {
    cookies[email.split("@")[0]!] = await appSession(email);
  }
  jobLead = await createAcceptedLead("ws-pages");
  jobId = await assignJob(jobLead, SEED_IDS.workshop);
});
afterAll(async () => {
  await cleanupOrders([jobLead]);
  await cleanupLeads([jobLead]);
});

const locationPath = (res: Response) => {
  const loc = res.headers.get("location");
  return loc ? new URL(loc, "http://x").pathname : null;
};

describe("pages", () => {
  it("anonymous /portal/xuong goes to login", async () => {
    const res = await webFetch("/portal/xuong");
    expect([302, 303, 307, 308]).toContain(res.status);
    expect(locationPath(res)).toBe("/login");
  });

  it("workshop loads /portal/xuong; staff and manager are redirected away", async () => {
    expect((await webFetch("/portal/xuong", { cookie: cookies.workshop })).status).toBe(200);
    expect((await webFetch("/portal/xuong", { cookie: cookies.admin })).status).toBe(200);
    for (const role of ["staff", "manager"]) {
      const res = await webFetch("/portal/xuong", { cookie: cookies[role] });
      expect(res.status, role).not.toBe(200);
      expect(locationPath(res), role).toBe("/portal");
    }
  });

  it("workshop is sent from the lead portal and admin pages to /portal/xuong, without lead data", async () => {
    for (const path of ["/portal", `/portal/leads/${LEAD}`, "/admin", "/admin/users", `/admin/leads/${LEAD}`]) {
      const res = await webFetch(path, { cookie: cookies.workshop });
      const body = await res.text();
      expect(res.status, path).not.toBe(200);
      expect(locationPath(res), path).toBe("/portal/xuong");
      expect(body, path).not.toMatch(/Nguyễn Văn A|0901234567|a@example\.com/);
    }
  });

  it("unknown or foreign job id is a 404", async () => {
    const res = await webFetch("/portal/xuong/00000000-0000-0000-0000-000000000000", { cookie: cookies.workshop });
    expect(res.status).toBe(404);
    const foreign = await webFetch(`/portal/xuong/${jobId}`, { cookie: cookies.workshop2 });
    expect(foreign.status).toBe(404);
  });

  it("job page shows specs and the convert form, never contact or price data", async () => {
    for (const [role, path] of [["workshop", `/portal/xuong/${jobId}`], ["workshop", "/portal/xuong"]] as const) {
      const res = await webFetch(path, { cookie: cookies[role] });
      const body = await res.text();
      expect(res.status, path).toBe(200);
      expect(body, path).toContain("SEC");
      for (const secret of ["0900000000", "sec-customer@example.com", "SEC Co", "security suite fixture", "10.000", "10.800"]) {
        expect(body, `${path} leaks ${secret}`).not.toContain(secret);
      }
    }
    const detail = await (await webFetch(`/portal/xuong/${jobId}`, { cookie: cookies.workshop })).text();
    expect(detail).toContain('name="dueDate"');
  });
});

describe("server actions", () => {
  const call = async (role: string, id: string, fields: Record<string, string> = {}) => {
    const res = await callAction({ page: "/portal/xuong", id, fields, cookie: cookies[role] });
    return { res, result: actionResult(await res.text()) };
  };

  it("staff and manager cannot invoke workshop actions", async () => {
    for (const role of ["staff", "manager"]) {
      for (const id of [ACTIONS.advanceStep(), ACTIONS.convertToProduction(), ACTIONS.assignWorkshop()]) {
        const { res, result } = await call(role, id);
        if (res.status === 200 && result) expect(result, role).toMatchObject({ status: "error", message: FORBIDDEN });
        else expect(res.status, role).toBeGreaterThanOrEqual(400);
      }
    }
  });

  it("workshop cannot invoke the admin assign action", async () => {
    const { res, result } = await call("workshop", ACTIONS.assignWorkshop(), { leadId: LEAD, userId: "" });
    if (res.status === 200 && result) expect(result).toMatchObject({ status: "error", message: FORBIDDEN });
    else expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("convert action rejects a past due date before calling the database", async () => {
    const { result } = await call("workshop", ACTIONS.convertToProduction(), { leadId: LEAD, dueDate: "2000-01-01" });
    expect(result?.status).toBe("error");
  });
});
