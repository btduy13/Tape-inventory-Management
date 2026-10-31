// Rule: customer-controlled lead text (name, company, note, design print text) is rendered
// HTML-escaped on every portal/admin page that shows it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RAW_MARKERS, appSession, createHostileLead, deleteLead, webFetch, type HostileLead } from "../helpers/web";

describe("portal/admin pages escape lead name, company, note and design text", () => {
  let lead: HostileLead;
  let cookie: string;

  beforeAll(async () => {
    lead = await createHostileLead();
    cookie = await appSession("admin@local.test");
  });
  afterAll(async () => {
    if (lead) await deleteLead(lead.id);
  });

  const pages = () => [
    { name: "portal list", path: "/portal" },
    { name: "portal lead detail", path: `/portal/leads/${lead.id}` },
    { name: "admin lead detail", path: `/admin/leads/${lead.id}` },
  ];

  it.each([0, 1, 2])("page #%i renders payloads escaped", async (i) => {
    const page = pages()[i]!;
    const res = await webFetch(page.path, { cookie });
    expect(res.status, `${page.name} status`).toBe(200);
    const html = await res.text();
    // The page really shows the lead (otherwise the check proves nothing).
    expect(html, `${page.name} shows the lead code`).toContain(lead.code);
    for (const marker of RAW_MARKERS) {
      expect(html.includes(marker), `${page.name} contains raw "${marker}"`).toBe(false);
    }
    expect(html, `${page.name} shows the escaped name`).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
