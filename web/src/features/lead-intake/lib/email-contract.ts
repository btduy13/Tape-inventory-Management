// Port used by the lead route. server/email-notifier.ts adapts features/email to it
// (features/email NewLeadEmailData has the same shape).

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
  /** Storage path in the private `previews` bucket (email feature signs it). */
  previewPath: string | null;
}

export interface LeadNotifier {
  /** Customer confirmation (only when the customer gave an email). */
  sendCustomerConfirmation(data: NewLeadEmailData): Promise<void>;
  /** Internal "new lead" mail to ADMIN_NOTIFY_EMAILS. */
  sendAdminNewLead(data: NewLeadEmailData): Promise<void>;
}
