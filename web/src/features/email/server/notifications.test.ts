import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ publicEnv: () => ({ NEXT_PUBLIC_SITE_URL: "https://shop.vn" }) }));
vi.mock("./factory", () => ({
  adminNotifyEmails: () => ["boss@shop.vn", "Boss@shop.vn"],
  getEmailSender: () => {
    throw new Error("tests pass an explicit sender");
  },
}));
vi.mock("./preview-image", () => ({ loadPreviewImage: vi.fn(async () => new Uint8Array([137, 80])) }));

import { FakeSender } from "../lib/fake-sender";
import {
  sendAdminNewLeadEmail,
  sendCustomerRespondedEmail,
  sendLeadConfirmationEmail,
  sendQuoteEmail,
  sendStaffAssignedEmail,
} from "./notifications";

const lead = {
  leadId: "11111111-1111-1111-1111-111111111111",
  code: "L-1",
  customerName: "An",
  phone: "0900",
  email: "khach@x.vn",
  company: null,
  quantity: 10,
  note: null,
  presetLabel: "48mm x 100m",
  previewPath: "11111111-1111-1111-1111-111111111111/preview.png",
};

let fake: FakeSender;
beforeEach(() => {
  fake = new FakeSender();
});

describe("notifications", () => {
  it("customer confirmation embeds preview inline", async () => {
    expect((await sendLeadConfirmationEmail(lead, fake)).ok).toBe(true);
    const m = fake.sent[0];
    expect(m.to).toEqual(["khach@x.vn"]);
    expect(m.attachments?.[0].contentId).toBe("mockup");
    expect(m.html).toContain('src="cid:mockup"');
  });

  it("customer confirmation skipped without email", async () => {
    expect((await sendLeadConfirmationEmail({ ...lead, email: null }, fake)).ok).toBe(false);
    expect(fake.sent).toHaveLength(0);
  });

  it("admin new lead goes to deduped admin list with absolute link", async () => {
    await sendAdminNewLeadEmail(lead, fake);
    expect(fake.sent[0].to).toEqual(["boss@shop.vn"]);
    expect(fake.sent[0].html).toContain(`https://shop.vn/admin/leads/${lead.leadId}`);
    expect(fake.sent[0].replyTo).toBe("khach@x.vn");
  });

  it("staff assigned links to portal", async () => {
    await sendStaffAssignedEmail(
      { leadId: lead.leadId, code: "L-1", customerName: "An", staffEmail: "nv@shop.vn", staffName: "NV" },
      fake,
    );
    expect(fake.sent[0].to).toEqual(["nv@shop.vn"]);
    expect(fake.sent[0].html).toContain(`https://shop.vn/portal/leads/${lead.leadId}`);
  });

  it("quote email carries token link and PDF", async () => {
    await sendQuoteEmail(
      {
        code: "L-1",
        customerName: "An",
        customerEmail: "khach@x.vn",
        total: 100,
        token: "tok_123",
        linkExpiresAt: "2026-11-14T00:00:00Z",
        pdf: { filename: "bao-gia.pdf", content: new Uint8Array([1]) },
      },
      fake,
    );
    expect(fake.sent[0].html).toContain("https://shop.vn/q/tok_123");
    expect(fake.sent[0].attachments?.[0].contentType).toBe("application/pdf");
  });

  it("customer responded goes to staff + admins", async () => {
    await sendCustomerRespondedEmail(
      { leadId: lead.leadId, code: "L-1", customerName: "An", response: "accepted", quoteVersion: 1, staffEmail: "nv@shop.vn" },
      fake,
    );
    expect(fake.sent[0].to).toEqual(["nv@shop.vn", "boss@shop.vn"]);
  });

  it("never throws when the sender throws", async () => {
    const broken = { kind: "fake" as const, send: vi.fn().mockRejectedValue(new Error("boom")) };
    expect(await sendAdminNewLeadEmail(lead, broken)).toEqual({ ok: false, error: "send failed" });
  });
});
