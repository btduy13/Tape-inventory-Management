// Internal notification: customer accepted / asked for changes on a quote.
import { format } from "@/i18n";
import { vi } from "@/i18n/vi";
import { escapeHtml, escapeMultiline, oneLine } from "../lib/escape";
import { renderLayout } from "../lib/layout";
import type { RenderedEmail } from "../lib/types";

export interface CustomerRespondedInput {
  code: string;
  customerName: string;
  response: "accepted" | "changes_requested";
  note?: string | null;
  quoteVersion: number;
  leadUrl: string;
}

export function customerRespondedEmail(input: CustomerRespondedInput): RenderedEmail {
  const subject = format(vi.email.customerResponseSubject, { code: oneLine(input.code, 40) });
  const label = vi.quoteStatus[input.response];
  const summary = `Khách hàng ${input.customerName} (${input.code}) đã phản hồi báo giá phiên bản ${input.quoteVersion}: ${label}.`;
  const noteHtml = input.note
    ? `<p><strong>Nội dung khách gửi:</strong></p><blockquote style="margin:0;padding:8px 12px;border-left:3px solid #d4d4d8;color:#3f3f46">${escapeMultiline(input.note)}</blockquote>`
    : "";

  const html = renderLayout({
    heading: escapeHtml(label),
    bodyHtml: `<p>${escapeHtml(summary)}</p>${noteHtml}`,
    cta: { label: "Mở khách hàng", url: input.leadUrl },
  });
  const text = `${summary}${input.note ? `\n\nNội dung khách gửi:\n${input.note}` : ""}

${input.leadUrl}`;
  return { subject, html, text };
}
