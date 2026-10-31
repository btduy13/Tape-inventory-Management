// Renders a quote PDF to bytes (Node runtime only).
import "server-only";
import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { ensurePdfFonts } from "./fonts";
import { QuoteDocument, type QuotePdfData } from "./quote-document";

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // bucket limit (migration 0006)

export async function renderQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  const fontFamily = ensurePdfFonts();
  const doc = createElement(QuoteDocument, { data, fontFamily }) as unknown as ReactElement<DocumentProps>;
  const buf = await renderToBuffer(doc);
  if (buf.byteLength > MAX_PDF_BYTES) throw new Error("quote PDF exceeds bucket size limit");
  return new Uint8Array(buf);
}

export const quotePdfFilename = (code: string, version: number) =>
  `bao-gia-${code.replace(/[^A-Za-z0-9_-]/g, "")}-v${version}.pdf`;
