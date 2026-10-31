// Shared HTML shell for all templates. Inline styles only (email clients ignore <style>).
import { vi } from "@/i18n/vi";
import { escapeHtml, safeUrl } from "./escape";

export interface LayoutInput {
  /** Already escaped heading text. */
  heading: string;
  /** Already escaped/sanitized body HTML. */
  bodyHtml: string;
  cta?: { label: string; url: string } | null;
}

export function renderLayout({ heading, bodyHtml, cta }: LayoutInput): string {
  const ctaUrl = cta ? safeUrl(cta.url) : null;
  const button =
    cta && ctaUrl
      ? `<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="background:#1d4ed8;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(cta.label)}</a></p>`
      : "";
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px">
<tr><td style="padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
${bodyHtml}
${button}
<p style="font-size:12px;color:#71717a;margin-top:32px">${escapeHtml(vi.common.appName)}</p>
</td></tr></table></td></tr></table>
</body></html>`;
}

/** Key/value rows (values escaped here). */
export function renderDetails(rows: ReadonlyArray<readonly [string, unknown]>): string {
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#71717a;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${body}</table>`;
}

/** Plain-text version of the same detail rows. */
export function textDetails(rows: ReadonlyArray<readonly [string, unknown]>): string {
  return rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");
}
