// In-memory sender for local dev (no Resend API key configured) and unit tests.
import type { EmailMessage, EmailSender, SendResult } from "./types";

export class FakeSender implements EmailSender {
  readonly kind = "fake" as const;
  readonly sent: EmailMessage[] = [];
  private counter = 0;

  constructor(private readonly options: { log?: boolean; failWith?: string } = {}) {}

  async send(message: EmailMessage): Promise<SendResult> {
    if (this.options.failWith) return { ok: false, error: this.options.failWith };
    this.sent.push(message);
    this.counter += 1;
    if (this.options.log) {
      // Dev aid only: subject + recipients, never the body (may contain links/tokens).
      console.info(`[email:fake] to=${message.to.join(",")} subject=${message.subject}`);
    }
    return { ok: true, id: `fake-${this.counter}` };
  }

  clear(): void {
    this.sent.length = 0;
  }
}
