// High-level notification helpers used by other features (lead-intake, assignment, quotes).
// Each returns a SendResult and never throws: email failure must not break the main flow.
import "server-only";
import { publicEnv } from "@/lib/env";
import { ROUTES } from "@/lib/routes";
import { normalizeRecipients } from "../lib/recipients";
import { absoluteUrl } from "../lib/site-url";
import type { EmailAttachment, EmailSender, SendResult } from "../lib/types";
import { adminNewLeadEmail } from "../templates/admin-new-lead";
import { customerRespondedEmail, type CustomerRespondedInput } from "../templates/customer-responded";
import { leadConfirmationEmail } from "../templates/lead-confirmation";
import { quoteSentEmail, type QuoteSentInput } from "../templates/quote-sent";
import { staffAssignedEmail } from "../templates/staff-assigned";
import { adminNotifyEmails, getEmailSender } from "./factory";
import { loadPreviewImage } from "./preview-image";

/** Same shape as lead-intake's NewLeadEmailData. */
export interface NewLeadEmailData {
  leadId: string;
  code: string;
  customerName: string;
  phone: string;
  email: string | null;
  company: string | null;
  quantity: number;
  note: string | null;
  presetLabel: string;
  /** Storage path in the private `previews` bucket; embedded inline (cid). */
  previewPath: string | null;
}

const NO_RECIPIENTS: SendResult = { ok: false, error: "no recipients" };
const site = () => publicEnv().NEXT_PUBLIC_SITE_URL;

async function safeSend(sender: EmailSender, run: () => Promise<SendResult>): Promise<SendResult> {
  try {
    return await run();
  } catch (err) {
    console.error(`[email:${sender.kind}] send failed`, err instanceof Error ? err.message : err);
    return { ok: false, error: "send failed" };
  }
}

export async function sendLeadConfirmationEmail(
  data: NewLeadEmailData,
  sender: EmailSender = getEmailSender(),
): Promise<SendResult> {
  const to = normalizeRecipients([data.email]);
  if (to.length === 0) return NO_RECIPIENTS;
  return safeSend(sender, async () => {
    const image = data.previewPath ? await loadPreviewImage(data.previewPath) : null;
    const attachments: EmailAttachment[] = image
      ? [{ filename: "mau-bang-keo.png", content: image, contentType: "image/png", contentId: "mockup" }]
      : [];
    const mail = leadConfirmationEmail({
      code: data.code,
      customerName: data.customerName,
      quantity: data.quantity,
      presetLabel: data.presetLabel,
      mockupImageSrc: image ? "cid:mockup" : null,
    });
    return sender.send({ to, ...mail, attachments });
  });
}

export async function sendAdminNewLeadEmail(
  data: NewLeadEmailData,
  sender: EmailSender = getEmailSender(),
): Promise<SendResult> {
  const to = normalizeRecipients(adminNotifyEmails());
  if (to.length === 0) return NO_RECIPIENTS;
  const mail = adminNewLeadEmail({ ...data, leadUrl: absoluteUrl(site(), ROUTES.adminLead(data.leadId)) });
  return safeSend(sender, () => sender.send({ to, ...mail, replyTo: data.email ?? undefined }));
}

export interface StaffAssignedEmailData {
  leadId: string;
  code: string;
  customerName: string;
  phone?: string | null;
  quantity?: number | null;
  staffEmail: string | null;
  staffName: string;
}

export async function sendStaffAssignedEmail(
  data: StaffAssignedEmailData,
  sender: EmailSender = getEmailSender(),
): Promise<SendResult> {
  const to = normalizeRecipients([data.staffEmail]);
  if (to.length === 0) return NO_RECIPIENTS;
  const mail = staffAssignedEmail({ ...data, leadUrl: absoluteUrl(site(), ROUTES.portalLead(data.leadId)) });
  return safeSend(sender, () => sender.send({ to, ...mail }));
}

export interface QuoteEmailData extends Omit<QuoteSentInput, "quoteUrl"> {
  customerEmail: string;
  /** Raw token (only ever placed in this email). */
  token: string;
  pdf?: { filename: string; content: Uint8Array } | null;
}

export async function sendQuoteEmail(
  data: QuoteEmailData,
  sender: EmailSender = getEmailSender(),
): Promise<SendResult> {
  const to = normalizeRecipients([data.customerEmail]);
  if (to.length === 0) return NO_RECIPIENTS;
  const mail = quoteSentEmail({ ...data, quoteUrl: absoluteUrl(site(), ROUTES.quoteView(data.token)) });
  const attachments: EmailAttachment[] = data.pdf
    ? [{ filename: data.pdf.filename, content: data.pdf.content, contentType: "application/pdf" }]
    : [];
  return safeSend(sender, () => sender.send({ to, ...mail, attachments }));
}

export interface CustomerRespondedEmailData extends Omit<CustomerRespondedInput, "leadUrl"> {
  leadId: string;
  /** Assigned staff email (admins come from ADMIN_NOTIFY_EMAILS). */
  staffEmail?: string | null;
}

export async function sendCustomerRespondedEmail(
  data: CustomerRespondedEmailData,
  sender: EmailSender = getEmailSender(),
): Promise<SendResult> {
  const to = normalizeRecipients([data.staffEmail, ...adminNotifyEmails()]);
  if (to.length === 0) return NO_RECIPIENTS;
  const mail = customerRespondedEmail({ ...data, leadUrl: absoluteUrl(site(), ROUTES.portalLead(data.leadId)) });
  return safeSend(sender, () => sender.send({ to, ...mail }));
}
