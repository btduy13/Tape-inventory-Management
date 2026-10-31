// Customer email with the quote link (PDF attached by the caller).
import { format, formatVnd } from "@/i18n";
import { vi } from "@/i18n/vi";
import { escapeHtml, oneLine } from "../lib/escape";
import { renderDetails, renderLayout, textDetails } from "../lib/layout";
import type { RenderedEmail } from "../lib/types";

export interface QuoteSentInput {
  code: string;
  customerName: string;
  total: number;
  /** ISO date (yyyy-mm-dd) or null. */
  validUntil?: string | null;
  /** Absolute /q/<token> URL. */
  quoteUrl: string;
  /** When the link stops working (ISO timestamp). */
  linkExpiresAt: string;
}

function viDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function quoteSentEmail(input: QuoteSentInput): RenderedEmail {
  const subject = format(vi.email.quoteSubject, { code: oneLine(input.code, 40) });
  const rows = [
    ["Mã yêu cầu", input.code],
    [vi.quotes.total, formatVnd(input.total)],
    [vi.quotes.validUntil, input.validUntil ? viDate(input.validUntil) : null],
  ] as const;
  const expiry = viDate(input.linkExpiresAt);

  const html = renderLayout({
    heading: escapeHtml(`Xin chào ${input.customerName},`),
    bodyHtml: `<p>Chúng tôi gửi bạn báo giá băng keo in (file PDF đính kèm). Bạn có thể xem và phản hồi trực tuyến bằng nút bên dưới.</p>
${renderDetails(rows)}
<p style="font-size:13px;color:#71717a">Liên kết có hiệu lực đến ${escapeHtml(expiry)} và chỉ dùng được cho một lần phản hồi. Vui lòng không chuyển tiếp email này.</p>`,
    cta: { label: "Xem và phản hồi báo giá", url: input.quoteUrl },
  });
  const text = `Xin chào ${input.customerName},

Chúng tôi gửi bạn báo giá băng keo in (file PDF đính kèm).

${textDetails(rows)}

Xem và phản hồi: ${input.quoteUrl}
Liên kết có hiệu lực đến ${expiry} và chỉ dùng được cho một lần phản hồi.`;
  return { subject, html, text };
}
