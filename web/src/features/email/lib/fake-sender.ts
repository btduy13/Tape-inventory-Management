// In-memory sender for local dev (no Resend API key configured) and unit tests.
import type { EmailMessage, EmailSender, SendResult } from "./types";

export class FakeSender implements EmailSender {
  readonly kind = "fake" as const;
  readonly sent: EmailMessage[] = [];
  private counter = 0;

  /**
   * log: subject + recipients. logLinks (local dev only, never production): also the customer
   * quote links (/q/<token>) found in the text body, since the raw token is never stored.
   */
  constructor(private readonly options: { log?: boolean; logLinks?: boolean; failWith?: string } = {}) {}

  async send(message: EmailMessage): Promise<SendResult> {
    if (this.options.failWith) return { ok: false, error: this.options.failWith };
    this.sent.push(message);
    this.counter += 1;
    if (this.options.log) {
      // Dev aid only: subject + recipients, never the body (may contain links/tokens).
      console.info(`[email:fake] to=${message.to.join(",")} subject=${message.subject}`);
    }
    if (this.options.logLinks) {
      for (const link of quoteLinks(message.text)) console.info(`[email:fake] quote link: ${link}`);
    }
    return { ok: true, id: `fake-${this.counter}` };
  }

  clear(): void {
    this.sent.length = 0;
  }
}

const QUOTE_LINK = /https?:\/\/[^\s"'<>]+\/q\/[A-Za-z0-9_-]{32,128}/g;

/** Customer quote links (/q/<token>) in a plain-text email body. */
export function quoteLinks(text: string): string[] {
  return [...new Set(text.match(QUOTE_LINK) ?? [])];
}
