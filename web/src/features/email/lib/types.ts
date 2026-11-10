// Email abstractions shared by the Resend and fake senders.

export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
  contentType: string;
  /** Set to embed inline and reference it from HTML as `cid:<contentId>`. */
  contentId?: string;
}

export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

/** What a template renders (recipients are added by the caller). */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export interface EmailSender {
  readonly kind: "resend" | "smtp" | "fake";
  send(message: EmailMessage): Promise<SendResult>;
}
