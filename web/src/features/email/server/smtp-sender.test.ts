import { describe, expect, it, vi } from "vitest";
import { SmtpSender, smtpSecurity, type TransportLike } from "./smtp-sender";

const cfg = { server: "smtp.gmail.com", port: 587, username: "shop@gmail.com", password: "x", sender: "" };
const msg = { to: ["a@b.vn"], subject: "S\nX", html: "<p>h</p>", text: "h" };

describe("smtpSecurity (same as the app)", () => {
  it("465 is TLS, 587 requires STARTTLS, LAN relay may skip it", () => {
    expect(smtpSecurity("smtp.gmail.com", 465)).toEqual({ secure: true, requireTLS: false });
    expect(smtpSecurity("smtp.gmail.com", 587)).toEqual({ secure: false, requireTLS: true });
    expect(smtpSecurity("192.168.1.5", 25)).toEqual({ secure: false, requireTLS: false });
    expect(smtpSecurity("10mail.example.com", 587).requireTLS).toBe(true);
  });
});

describe("SmtpSender", () => {
  it("sends with the app's default sender line and one-line subject", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "m1" });
    const s = new SmtpSender(cfg, { sendMail } as TransportLike);
    expect(await s.send({ ...msg, attachments: [{ filename: "a.pdf", content: new Uint8Array([1]), contentType: "application/pdf" }] }))
      .toEqual({ ok: true, id: "m1" });
    const mail = sendMail.mock.calls[0]![0];
    expect(mail.from).toBe("Phần Mềm Quản Lý Đơn Hàng <shop@gmail.com>");
    expect(mail.subject).not.toContain("\n");
    expect(Buffer.isBuffer(mail.attachments[0].content)).toBe(true);
  });

  it("returns the SMTP error instead of throwing", async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error("Invalid login"));
    expect(await new SmtpSender(cfg, { sendMail }).send(msg)).toEqual({ ok: false, error: "Invalid login" });
  });
});
