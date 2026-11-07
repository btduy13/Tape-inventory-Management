// Order list -> CSV for Excel (UTF-8 BOM, comma, CRLF). Replaces the app's Excel export on the web.
import { getDictionary } from "@/i18n";
import type { ProductionStep } from "@/lib/types";
import { CSV_COLUMNS, TYPE_LABEL } from "./copy";
import type { AdminOrderRow } from "./types";

const t = getDictionary();

/** Quotes every cell; text starting with = + - @ gets a ' so Excel does not run it as a formula. */
function cell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = "";
  else if (typeof value === "boolean") s = value ? "x" : "";
  else if (typeof value === "number") s = String(value);
  else {
    s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

export function ordersCsv(rows: readonly AdminOrderRow[]): string {
  const lines = [CSV_COLUMNS.map(([, label]) => cell(label)).join(",")];
  for (const r of rows) {
    lines.push(CSV_COLUMNS.map(([key]) => {
      if (key === "type") return cell(TYPE_LABEL[r.type] ?? r.type);
      if (key === "step") return cell(r.step ? t.productionStep[r.step as ProductionStep] : "");
      return cell(r[key]);
    }).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
