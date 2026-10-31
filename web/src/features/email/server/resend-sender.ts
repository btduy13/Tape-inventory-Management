// Resend implementation of EmailSender.
import "server-only";
import { Resend } from "resend";
import type { EmailMessage, EmailSender, SendResult } from "../lib/types";
import { oneLine } from "../lib/escape";

/** Minimal surface of the Resend client we use (lets tests inject a mock). */
export interface ResendLike {
  emails: {
    send(payload: Parameters<Resend["emails"]["send"]>[0]): Promise<{
      data: { id: string } | null;
      error: { message: string } | null;
    }>;
  };
}

export class ResendSender implements EmailSender {
  readonly kind = "resend" as const;
  private readonly client: ResendLike;

  constructor(
    apiKey: string,
    private readonly from: string,
    client?: ResendLike,
  ) {
    this.client = client ?? (new Resend(apiKey) as unknown as ResendLike);
  }

  async send(message: EmailMessage): Promise<SendResult> {
    if (message.to.length === 0) return { ok: false, error: "no recipients" };
    try {
      const { data, error } = await this.client.emails.send({
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
          contentId: a.contentId,
        })),
      });
      if (error || !data) return { ok: false, error: error?.message ?? "unknown resend error" };
      return { ok: true, id: data.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "resend request failed" };
    }
  }
}
