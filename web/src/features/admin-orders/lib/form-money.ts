// Money inputs of the order form: shown with "." thousands and "," decimals (vi-VN), sent as a plain
// number string. The parse rules are the app's utils.parseCurrency (electron/js/utils.js), so
// "1.200.000", "1,200,000" and "1200000" all mean 1 200 000.

const display = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

/** Typed text -> number; null when it holds no digit (empty field). Same rules as the app:
 *  several separators: the last one is decimal only when 1-2 digits follow; one separator with
 *  exactly 3 digits after a 1-3 digit integer part (not 0) is thousands; otherwise it is decimal. */
export function parseMoney(text: string): number | null {
  if (!/\d/.test(text)) return null;
  let s = text.trim().replace(/[^\d,.-]/g, "");
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  const seps = (s.match(/[.,]/g) ?? []).length;
  if (seps > 1) {
    const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const fraction = s.slice(last + 1);
    s = /^\d{1,2}$/.test(fraction) ? `${s.slice(0, last).replace(/[.,]/g, "")}.${fraction}` : s.replace(/[.,]/g, "");
  } else if (seps === 1) {
    const [int = "", fraction = ""] = s.split(/[.,]/);
    const thousands = /^\d{3}$/.test(fraction) && /^\d{1,3}$/.test(int) && !/^0+$/.test(int);
    s = thousands ? int + fraction : `${int || "0"}.${fraction}`;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative && n !== 0 ? -n : n;
}

/** Typed text -> the value the form submits ("" = empty field). */
export function moneyValue(text: string): string {
  const n = parseMoney(text);
  return n === null ? "" : String(n);
}

/** Stored value ("1200000", "12.5", "") -> what the input shows ("1.200.000", "12,5", ""). */
export function formatMoneyInput(value: string): string {
  if (value.trim() === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? display.format(n) : value;
}
