// Pure conversions between a saved quote and the editor's string-based form state.
import type { SaveDraftInput } from "./schemas";
import type { QuoteWithLines } from "./types";

export interface EditorLine {
  key: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

export interface EditorState {
  vatPercent: string;
  validUntil: string;
  notes: string;
  lines: EditorLine[];
}

let seq = 0;
export const newLineKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export const emptyLine = (): EditorLine => ({
  key: newLineKey(),
  description: "",
  unit: "cuộn",
  quantity: "1",
  unitPrice: "0",
});

export function toEditorState(q: QuoteWithLines): EditorState {
  return {
    vatPercent: String(q.vat_percent),
    validUntil: q.valid_until ?? "",
    notes: q.notes ?? "",
    lines: q.lines.map((l) => ({
      key: l.id,
      description: l.description,
      unit: l.unit,
      quantity: String(l.quantity),
      unitPrice: String(l.unit_price),
    })),
  };
}

/** Accepts "1.234.567" / "1 234 567" for money (vi-VN thousands separators). */
export function parseMoney(s: string): number {
  const cleaned = s.replace(/[\s.₫đ]/gi, "").replace(",", ".");
  return cleaned === "" ? Number.NaN : Number(cleaned);
}

/** Quantity accepts "," or "." as the decimal separator. */
export const parseQty = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.trim().replace(",", ".")));

export function toSaveInput(quoteId: string, s: EditorState): SaveDraftInput {
  return {
    quoteId,
    vatPercent: parseQty(s.vatPercent),
    validUntil: s.validUntil || null,
    notes: s.notes || null,
    lines: s.lines.map((l) => ({
      description: l.description,
      unit: l.unit || "cuộn",
      quantity: parseQty(l.quantity),
      unitPrice: parseMoney(l.unitPrice),
    })),
  };
}
