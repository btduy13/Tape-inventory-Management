import { describe, expect, it } from "vitest";
import { adminNewLeadEmail } from "./admin-new-lead";
import { customerRespondedEmail } from "./customer-responded";
import { leadConfirmationEmail } from "./lead-confirmation";
import { quoteSentEmail } from "./quote-sent";
import { staffAssignedEmail } from "./staff-assigned";

const XSS = `<img src=x onerror="alert(1)">`;

describe("email templates", () => {
  it("lead confirmation: escapes name, subject has code, cid image allowed", () => {
    const m = leadConfirmationEmail({ code: "L-001", customerName: XSS, quantity: 100, mockupImageSrc: "cid:mockup" });
    expect(m.subject).toBe("Đã nhận yêu cầu báo giá L-001");
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("&lt;img src&#61;x");
    expect(m.html).toContain('src="cid:mockup"');
  });

  it("lead confirmation: drops javascript image src", () => {
    const m = leadConfirmationEmail({ code: "L", customerName: "A", quantity: 1, mockupImageSrc: "javascript:x" });
    expect(m.html).not.toContain("javascript:");
  });

  it("admin new lead: escapes every user field incl. multi-line note", () => {
    const m = adminNewLeadEmail({
      code: "L-002",
      customerName: XSS,
      phone: XSS,
      email: "a@b.vn",
      company: XSS,
      quantity: 5,
      note: `line1\n${XSS}`,
      leadUrl: "https://x.vn/admin/leads/1",
    });
    expect(m.subject).toBe("Khách hàng mới: L-002");
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("line1<br>&lt;img");
    expect(m.html).toContain('href="https://x.vn/admin/leads/1"');
    expect(m.text).toContain(XSS); // plain text is not HTML
  });

  it("staff assigned", () => {
    const m = staffAssignedEmail({ code: "L-3", staffName: XSS, customerName: "Khách", leadUrl: "https://x.vn/portal/leads/1" });
    expect(m.subject).toBe("Bạn được giao khách hàng L-3");
    expect(m.html).not.toContain("<img src=x");
  });

  it("quote sent: link, total, no CTA for unsafe url", () => {
    const m = quoteSentEmail({
      code: "L-4",
      customerName: "An",
      total: 1234567,
      validUntil: "2026-12-01",
      quoteUrl: "https://x.vn/q/tok",
      linkExpiresAt: "2026-11-14T00:00:00Z",
    });
    expect(m.subject).toBe("Báo giá băng keo in L-4");
    expect(m.html).toContain('href="https://x.vn/q/tok"');
    expect(m.text).toContain("https://x.vn/q/tok");
    expect(m.html).toMatch(/1\.234\.567/);

    const bad = quoteSentEmail({ code: "L", customerName: "A", total: 1, quoteUrl: "javascript:x", linkExpiresAt: "2026-01-01" });
    expect(bad.html).not.toContain("javascript:");
  });

  it("customer responded: status label and escaped note", () => {
    const m = customerRespondedEmail({
      code: "L-5",
      customerName: "An",
      response: "changes_requested",
      note: XSS,
      quoteVersion: 2,
      leadUrl: "https://x.vn/portal/leads/1",
    });
    expect(m.subject).toBe("Khách hàng L-5 đã phản hồi báo giá");
    expect(m.html).toContain("Khách yêu cầu chỉnh sửa");
    expect(m.html).not.toContain("<img src=x");
  });

  it("subject cannot carry header injection", () => {
    const m = staffAssignedEmail({ code: "L\r\nBcc: x@y.z", staffName: "a", customerName: "b", leadUrl: "https://x.vn" });
    expect(m.subject).not.toMatch(/[\r\n]/);
  });
});
