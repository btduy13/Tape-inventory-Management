// Internal notification: a new lead arrived.
import { format } from "@/i18n";
import { vi } from "@/i18n/vi";
import { escapeHtml, escapeMultiline, oneLine } from "../lib/escape";
import { renderDetails, renderLayout, textDetails } from "../lib/layout";
import type { RenderedEmail } from "../lib/types";

export interface AdminNewLeadInput {
  code: string;
  customerName: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  quantity: number;
  presetLabel?: string | null;
  note?: string | null;
  /** Absolute URL of the lead in the admin/portal UI. */
  leadUrl: string;
}

export function adminNewLeadEmail(input: AdminNewLeadInput): RenderedEmail {
  const subject = format(vi.email.adminNewLeadSubject, { code: oneLine(input.code, 40) });
  const rows = [
    ["Mã", input.code],
    ["Khách hàng", input.customerName],
    ["Điện thoại", input.phone],
    ["Email", input.email ?? null],
    ["Công ty", input.company ?? null],
    ["Kích thước", input.presetLabel ?? null],
    ["Số lượng (cuộn)", input.quantity],
  ] as const;
  const noteHtml = input.note
    ? `<p style="margin-top:16px"><strong>Ghi chú của khách:</strong><br>${escapeMultiline(input.note)}</p>`
    : "";

  const html = renderLayout({
    heading: escapeHtml(`Khách hàng mới ${input.code}`),
    bodyHtml: `${renderDetails(rows)}${noteHtml}`,
    cta: { label: "Mở khách hàng", url: input.leadUrl },
  });
  const text = `Khách hàng mới ${input.code}

${textDetails(rows)}${input.note ? `\n\nGhi chú của khách:\n${input.note}` : ""}

${input.leadUrl}`;
  return { subject, html, text };
}
