// Public API of features/email (server-side library; do not import from client components).
export type { EmailAttachment, EmailMessage, EmailSender, RenderedEmail, SendResult } from "./lib/types";
export { escapeHtml, escapeMultiline, safeUrl, oneLine } from "./lib/escape";
export { normalizeRecipients } from "./lib/recipients";
export { FakeSender } from "./lib/fake-sender";
export { ResendSender } from "./server/resend-sender";
export { getEmailSender, setEmailSender, adminNotifyEmails } from "./server/factory";

export { leadConfirmationEmail, type LeadConfirmationInput } from "./templates/lead-confirmation";
export { adminNewLeadEmail, type AdminNewLeadInput } from "./templates/admin-new-lead";
export { staffAssignedEmail, type StaffAssignedInput } from "./templates/staff-assigned";
export { quoteSentEmail, type QuoteSentInput } from "./templates/quote-sent";
export { customerRespondedEmail, type CustomerRespondedInput } from "./templates/customer-responded";

export {
  sendLeadConfirmationEmail,
  sendAdminNewLeadEmail,
  sendStaffAssignedEmail,
  sendQuoteEmail,
  sendCustomerRespondedEmail,
  type NewLeadEmailData,
  type StaffAssignedEmailData,
  type QuoteEmailData,
  type CustomerRespondedEmailData,
} from "./server/notifications";
