// Picks the sender: Resend when RESEND_API_KEY is set, otherwise the in-memory fake.
import "server-only";
import { serverEnv } from "@/lib/env.server";
import { isProductionRuntime } from "@/lib/env.server";
import { FakeSender } from "../lib/fake-sender";
import type { EmailSender } from "../lib/types";
import { ResendSender } from "./resend-sender";

let current: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (current) return current;
  const env = serverEnv();
  if (env.RESEND_API_KEY) {
    current = new ResendSender(env.RESEND_API_KEY, env.EMAIL_FROM);
  } else if (isProductionRuntime(process.env)) {
    // Fail closed: a fake "sent" in production would mark quotes as sent although the customer
    // never got the link, and would log customer addresses. Callers see ok:false instead.
    console.error("[email] RESEND_API_KEY missing in production: emails are NOT delivered");
    current = new FakeSender({ failWith: "email not configured" });
  } else {
    // Local dev: also log /q/<token> links so the customer page can be opened without email.
    current = new FakeSender({ log: true, logLinks: true });
  }
  return current;
}

/** Tests / dev tooling: swap the sender (pass null to reset to the env default). */
export function setEmailSender(sender: EmailSender | null): void {
  current = sender;
}

export function adminNotifyEmails(): string[] {
  return serverEnv().ADMIN_NOTIFY_EMAILS;
}
