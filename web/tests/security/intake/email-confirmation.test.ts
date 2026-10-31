// Rule: lead emails contain only escaped user text, the customer confirmation carries no
// user-supplied link text, and user input cannot change recipients or headers.
//
// Local note: with RESEND_API_KEY unset the app uses the in-memory FakeSender, so lead emails
// never reach Mailpit. The mails are captured from the app's real notifier instead (same
// templates and recipient handling that Resend would get).
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EmailMessage } from "@/features/email";
import { captureEmails, cleanupIntakeData, leadForm, leadsWithNameLike, submitInProcess, uniqueTag } from "../helpers/intake";

afterAll(cleanupIntakeData);

let mails: { sent: EmailMessage[]; restore: () => void };
beforeEach(() => {
  mails = captureEmails();
});
afterEach(() => mails.restore());

const customerAddr = () => `${uniqueTag().toLowerCase()}@local.test`;
const confirmationTo = (addr: string) => mails.sent.find((m) => m.to.includes(addr));
const adminMail = (addr: string) => mails.sent.find((m) => !m.to.includes(addr));

describe("intake email: HTML in user fields is escaped (confirmation + admin mail)", () => {
  it("name/company/note markup is escaped, never rendered", async () => {
    const email = customerAddr();
    const payload = `<img src=x onerror=alert(1)><b>"'&`;
    const r = await submitInProcess(
      await leadForm({ name: `${uniqueTag()} ${payload}`, company: `<a href="https://evil.example">c</a>`, note: `<script>alert(2)</script>`, email }),
    );
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const conf = confirmationTo(email);
    const admin = adminMail(email);
    expect(conf, "confirmation mail captured").toBeTruthy();
    expect(admin, "admin mail captured").toBeTruthy();
    for (const m of [conf!, admin!]) {
      expect(m.html).not.toMatch(/<img[^>]*onerror/i);
      expect(m.html).not.toMatch(/<script/i);
      expect(m.html).not.toMatch(/<b>"/);
      expect(m.html).not.toContain('href="https://evil.example"');
      expect(m.subject).not.toMatch(/[\r\n]/);
    }
    expect(conf!.html).toContain("&lt;img");
  });
});

describe("intake email: confirmation to a requester-typed address carries no user-supplied links", () => {
  const LINKY_NAMES = [
    "Visit https://evil.vn/login now",
    "go www.evil-shop.vn",
    "EVIL.VN/km",
    "support@evil.vn",
    "xem tại khuyến-mãi.vn/qua",
    "nhận quà ở bánhmì.vn",
    "http://192.168.1.1/x",
  ];
  for (const name of LINKY_NAMES) {
    it(`name ${JSON.stringify(name)} does not appear in the confirmation`, async () => {
      const email = customerAddr();
      const r = await submitInProcess(await leadForm({ name: `${uniqueTag()} ${name}`, email }));
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      const conf = confirmationTo(email);
      expect(conf, "confirmation mail captured").toBeTruthy();
      for (const part of [conf!.html, conf!.text, conf!.subject]) {
        expect(part).not.toContain(name);
        expect(part).not.toMatch(/evil|khuyến-mãi\.vn|bánhmì\.vn|192\.168\.1\.1/i);
      }
      expect(conf!.html).not.toMatch(/<a\s/i);
    });
  }
});

describe("intake email: user input cannot change recipients", () => {
  it("comma/semicolon separated email list -> rejected, no mail sent", async () => {
    const tag = uniqueTag();
    for (const email of ["a@local.test,victim@local.test", "a@local.test; victim@local.test", "a@local.test\nbcc:victim@local.test"]) {
      const r = await submitInProcess(await leadForm({ name: tag, email }));
      expect(r.status, email).toBe(422);
    }
    expect(mails.sent).toHaveLength(0);
    expect(await leadsWithNameLike(tag)).toHaveLength(0);
  });

  it("confirmation goes to exactly the one submitted address; admin mail only to ADMIN_NOTIFY_EMAILS", async () => {
    const email = customerAddr();
    const r = await submitInProcess(await leadForm({ email }));
    expect(r.status).toBe(201);
    const conf = confirmationTo(email)!;
    expect(conf.to).toEqual([email]);
    expect(conf.replyTo ?? null).toBeNull();
    const admins = (process.env.ADMIN_NOTIFY_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const admin = adminMail(email)!;
    expect([...admin.to].sort()).toEqual([...admins].sort());
  });
});
