// Rule: every customer field in the 5 email templates is HTML-escaped; subjects are one line.
import { describe, expect, it } from "vitest";
import {
  adminNewLeadEmail,
  customerRespondedEmail,
  leadConfirmationEmail,
  quoteSentEmail,
  staffAssignedEmail,
} from "@/features/email";
import { RAW_MARKERS, XSS } from "../helpers/web";

const NAME = `Evil ${XSS.tag}${XSS.attr}`;
const COMPANY = `Co ${XSS.attr}`;
const NOTE = `line1\n${XSS.script}\n${XSS.tag}`;
const CODE = `L2610-1\r\nBcc: victim@example.com ${XSS.tag}`;

function assertEscaped(label: string, html: string, subject: string) {
  for (const marker of RAW_MARKERS) expect(html.includes(marker), `${label} html contains "${marker}"`).toBe(false);
  expect(html, `${label} html keeps the escaped text`).toContain("&lt;img");
  expect(/[\r\n]/.test(subject), `${label} subject contains CR/LF`).toBe(false);
}

describe("email templates escape customer-controlled fields", () => {
  it("lead confirmation", () => {
    const m = leadConfirmationEmail({ code: CODE, customerName: NAME, quantity: 1, presetLabel: COMPANY, mockupImageSrc: "javascript:alert(1)" });
    assertEscaped("lead-confirmation", m.html, m.subject);
    expect(m.html).not.toContain("javascript:");
  });
  it("admin new lead", () => {
    const m = adminNewLeadEmail({ code: CODE, customerName: NAME, phone: "0912345678", company: COMPANY, quantity: 1, note: NOTE, leadUrl: "http://localhost:3000/portal/leads/x" });
    assertEscaped("admin-new-lead", m.html, m.subject);
  });
  it("staff assigned", () => {
    const m = staffAssignedEmail({ code: CODE, staffName: NAME, customerName: NAME, leadUrl: "http://localhost:3000/portal/leads/x" });
    assertEscaped("staff-assigned", m.html, m.subject);
  });
  it("quote sent", () => {
    const m = quoteSentEmail({ code: CODE, customerName: NAME, total: 1000, quoteUrl: "http://localhost:3000/q/abc", linkExpiresAt: new Date().toISOString() });
    assertEscaped("quote-sent", m.html, m.subject);
  });
  it("customer responded", () => {
    const m = customerRespondedEmail({ code: CODE, customerName: NAME, response: "changes_requested", note: NOTE, quoteVersion: 1, leadUrl: "http://localhost:3000/portal/leads/x" });
    assertEscaped("customer-responded", m.html, m.subject);
  });
  it("links never carry javascript: URLs", () => {
    const m = quoteSentEmail({ code: "L1", customerName: "A", total: 1, quoteUrl: "javascript:alert(1)", linkExpiresAt: new Date().toISOString() });
    expect(m.html).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
  });
});
