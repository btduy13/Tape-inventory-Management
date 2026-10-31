// Fires the lead emails. Best-effort: a mail failure never fails the customer's request.
import "server-only";
import type { LeadNotifier, NewLeadEmailData } from "../lib/email-contract";
import type { ParsedSubmission } from "./parse-submission";
import type { SavedLead } from "./save-lead";

export function toEmailData(saved: SavedLead, input: ParsedSubmission): NewLeadEmailData {
  const f = input.fields;
  return {
    leadId: saved.id,
    code: saved.code,
    customerName: f.name,
    phone: f.phone,
    email: f.email,
    company: f.company,
    quantity: f.quantity,
    note: f.note,
    presetLabel: saved.preset.label,
    previewPath: saved.previewPath,
  };
}

/** Returns how many mails failed (for logging only; no PII in logs). */
export async function notifyNewLead(notifier: LeadNotifier, data: NewLeadEmailData): Promise<number> {
  const jobs: Promise<void>[] = [notifier.sendAdminNewLead(data)];
  if (data.email) jobs.push(notifier.sendCustomerConfirmation(data));
  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) console.error(`[lead-intake] ${failed} notification(s) failed for lead ${data.code}`);
  return failed;
}

/** Used until features/email publishes its index.ts (see lib/email-contract.ts). */
export const noopNotifier: LeadNotifier = {
  async sendCustomerConfirmation() {},
  async sendAdminNewLead() {},
};
