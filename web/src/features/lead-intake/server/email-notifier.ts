// LeadNotifier backed by features/email (helpers never throw; failures are reported as errors here
// so notify.ts can count them).
import "server-only";
import { sendAdminNewLeadEmail, sendLeadConfirmationEmail } from "@/features/email";
import type { LeadNotifier } from "../lib/email-contract";

type SendResult = { ok: boolean; error?: string };

function check(kind: string, result: SendResult): void {
  // "no recipients" (customer left no email / ADMIN_NOTIFY_EMAILS empty) is not a failure.
  if (!result.ok && result.error !== "no recipients") throw new Error(`${kind} email failed`);
}

export const emailLeadNotifier: LeadNotifier = {
  async sendCustomerConfirmation(data) {
    check("confirmation", await sendLeadConfirmationEmail(data));
  },
  async sendAdminNewLead(data) {
    check("admin", await sendAdminNewLeadEmail(data));
  },
};
