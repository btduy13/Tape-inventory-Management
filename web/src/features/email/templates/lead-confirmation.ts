// Customer confirmation after a quote request (optionally with the mockup image).
import { format } from "@/i18n";
import { vi } from "@/i18n/vi";
import { containsLink, escapeHtml, oneLine, safeUrl } from "../lib/escape";
import { renderDetails, renderLayout, textDetails } from "../lib/layout";
import type { RenderedEmail } from "../lib/types";

export interface LeadConfirmationInput {
  code: string;
  customerName: string;
  quantity: number;
  presetLabel?: string | null;
  /** https URL or `cid:<id>` of an inline attachment. Anything else is dropped. */
  mockupImageSrc?: string | null;
}

export function leadConfirmationEmail(input: LeadConfirmationInput): RenderedEmail {
  const subject = format(vi.email.customerConfirmSubject, { code: oneLine(input.code, 40) });
  const rows = [
    ["Mã yêu cầu", input.code],
    ["Kích thước", input.presetLabel ?? null],
    ["Số lượng (cuộn)", input.quantity],
  ] as const;
  const img = safeUrl(input.mockupImageSrc, { allowCid: true });
  const imgHtml = img
    ? `<p><img src="${escapeHtml(img)}" alt="Mẫu băng keo" width="560" style="max-width:100%;height:auto;border:1px solid #e4e4e7;border-radius:6px"></p>`
    : "";

  // This mail goes to an address typed by the requester, so the requester-typed name must
  // not carry links (the form would otherwise relay phishing text to any inbox).
  const greeting = containsLink(input.customerName) ? "Xin chào quý khách," : `Xin chào ${input.customerName},`;
  const html = renderLayout({
    heading: escapeHtml(greeting),
    bodyHtml: `<p>Chúng tôi đã nhận được yêu cầu báo giá băng keo in của bạn. Nhân viên sẽ liên hệ trong thời gian sớm nhất.</p>
${renderDetails(rows)}
${imgHtml}`,
  });
  const text = `${greeting}

Chúng tôi đã nhận được yêu cầu báo giá băng keo in của bạn. Nhân viên sẽ liên hệ trong thời gian sớm nhất.

${textDetails(rows)}`;
  return { subject, html, text };
}
