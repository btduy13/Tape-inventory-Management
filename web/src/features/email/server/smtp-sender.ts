import "server-only";
import nodemailer from "nodemailer";
import type { EmailMessage, EmailSender, SendResult } from "../lib/types";
import { oneLine } from "../lib/escape";

export type SmtpConfig = { server: string; port: number; username: string; password: string; sender: string };

const PRIVATE_IPV4 = /^(10\.\d{1,3}|172\.(1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}$/;

/** Same rule as electron/emailPolicy.js smtpSecurityOptions: 465 = TLS, else STARTTLS required (except a local relay). */
export function smtpSecurity(server: string, port: number): { secure: boolean; requireTLS: boolean } {
  const host = server.replace(/^\[|\]$/g, "").toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1" || PRIVATE_IPV4.test(host);
  const secure = port === 465;
  return { secure, requireTLS: !secure && !local };
}

/** Minimal surface of the nodemailer transport we use (lets tests inject a mock). */
export interface TransportLike {
  sendMail(mail: nodemailer.SendMailOptions): Promise<{ messageId?: string }>;
}

export class SmtpSender implements EmailSender {
  readonly kind = "smtp" as const;
  private readonly transport: TransportLike;
  private readonly from: string;

  constructor(cfg: SmtpConfig, transport?: TransportLike) {
    // Same default sender line as the app when none is configured.
    this.from = cfg.sender || `Phần Mềm Quản Lý Đơn Hàng <${cfg.username}>`;
    this.transport = transport ?? nodemailer.createTransport({
      host: cfg.server,
      port: cfg.port,
      ...smtpSecurity(cfg.server, cfg.port),
      auth: cfg.username ? { user: cfg.username, pass: cfg.password } : undefined,
      // Attachments are buffers we built; never let a message read files or URLs.
      disableFileAccess: true,
      disableUrlAccess: true,
      connectionTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }

  async send(message: EmailMessage): Promise<SendResult> {
    if (message.to.length === 0) return { ok: false, error: "no recipients" };
    try {
      const info = await this.transport.sendMail({
        from: this.from,
        to: message.to,
        subject: oneLine(message.subject, 200),
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content),
          contentType: a.contentType,
          cid: a.contentId,
        })),
      });
      return { ok: true, id: info.messageId ?? "smtp" };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "smtp send failed" };
    }
  }
}
