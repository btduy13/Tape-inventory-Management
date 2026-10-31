// Internal notification: a lead was assigned to a staff member / CTV.
import { format } from "@/i18n";
import { vi } from "@/i18n/vi";
import { escapeHtml, oneLine } from "../lib/escape";
import { renderDetails, renderLayout, textDetails } from "../lib/layout";
import type { RenderedEmail } from "../lib/types";

export interface StaffAssignedInput {
  code: string;
  staffName: string;
  customerName: string;
  phone?: string | null;
  quantity?: number | null;
  /** Absolute URL of the lead in the portal. */
  leadUrl: string;
}

export function staffAssignedEmail(input: StaffAssignedInput): RenderedEmail {
  const subject = format(vi.email.staffAssignedSubject, { code: oneLine(input.code, 40) });
  const rows = [
    ["Mã", input.code],
    ["Khách hàng", input.customerName],
    ["Điện thoại", input.phone ?? null],
    ["Số lượng (cuộn)", input.quantity ?? null],
  ] as const;

  const html = renderLayout({
    heading: escapeHtml(`Chào ${input.staffName},`),
    bodyHtml: `<p>Bạn vừa được giao phụ trách khách hàng <strong>${escapeHtml(input.code)}</strong>. Vui lòng liên hệ tư vấn sớm.</p>
${renderDetails(rows)}`,
    cta: { label: "Mở khách hàng", url: input.leadUrl },
  });
  const text = `Chào ${input.staffName},

Bạn vừa được giao phụ trách khách hàng ${input.code}. Vui lòng liên hệ tư vấn sớm.

${textDetails(rows)}

${input.leadUrl}`;
  return { subject, html, text };
}
