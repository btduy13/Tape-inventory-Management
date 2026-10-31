// Rule: admin Server Actions refuse a staff session (forbidden), before any validation or write.
// Payloads are deliberately empty/invalid so a missing check yields a validation error, never a write.
import { beforeAll, describe, expect, it } from "vitest";
import { ACTIONS, actionResult, appSession, callAction } from "../helpers/web";

const FORBIDDEN = "Bạn không có quyền thực hiện thao tác này.";

const CASES = [
  { name: "savePresetAction", page: "/admin/presets", id: () => ACTIONS.savePreset(), fields: {} },
  { name: "inviteUserAction", page: "/admin/users", id: () => ACTIONS.inviteUser(), fields: {} },
  { name: "updateUserAction", page: "/admin/users", id: () => ACTIONS.updateUser(), fields: {} },
  { name: "assignLeadAction", page: "/portal/leads/00000000-0000-0000-0000-0000000b0001", id: () => ACTIONS.assignLead(), fields: {} },
  { name: "convertToProductionAction", page: "/admin/leads/00000000-0000-0000-0000-0000000b0001", id: () => ACTIONS.convertToProduction(), fields: {} },
];

describe("staff session cannot invoke admin server actions", () => {
  let cookie: string;
  beforeAll(async () => {
    cookie = await appSession("staff@local.test");
  });

  it.each(CASES)("$name returns forbidden for staff", async (c) => {
    const res = await callAction({ page: c.page, id: c.id(), fields: c.fields, cookie });
    const text = await res.text();
    const result = actionResult(text);
    // Either the action refuses with the forbidden message, or the request is rejected outright.
    if (res.status === 200 && result) {
      expect(result.status, `${c.name} result ${JSON.stringify(result)}`).toBe("error");
      expect(result.message, `${c.name} result ${JSON.stringify(result)}`).toBe(FORBIDDEN);
    } else {
      expect(res.status, `${c.name} HTTP ${res.status}`).toBeGreaterThanOrEqual(400);
    }
  });
});
