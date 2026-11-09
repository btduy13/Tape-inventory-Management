// Amount in Vietnamese words: port of orderMath.toVietnameseWords (electron/js/orderMath.js).
// words.parity.test.ts compares both on the same inputs.
import { number } from "@/features/admin-orders/lib/order-math";

const DIGITS = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function readGroup(group: number, forceHundreds: boolean): string {
  const words: string[] = [];
  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const ones = group % 10;

  if (hundreds > 0) words.push(`${DIGITS[hundreds]} trăm`);
  else if (forceHundreds) words.push("không trăm");

  if (tens > 1) {
    words.push(`${DIGITS[tens]} mươi`);
    if (ones === 1) words.push("mốt");
    else if (ones === 4) words.push("tư");
    else if (ones === 5) words.push("lăm");
    else if (ones > 0) words.push(DIGITS[ones]);
  } else if (tens === 1) {
    words.push("mười");
    if (ones === 5) words.push("lăm");
    else if (ones > 0) words.push(DIGITS[ones]);
  } else if (ones > 0) {
    if (hundreds > 0 || forceHundreds) words.push("lẻ");
    words.push(DIGITS[ones]);
  }
  return words.join(" ");
}

export function toVietnameseWords(value: unknown): string {
  const amount = Math.round(number(value as number));
  if (amount < 0) {
    const positive = toVietnameseWords(-amount);
    return `Âm ${positive.charAt(0).toLowerCase()}${positive.slice(1)}`;
  }
  if (amount === 0) return "Không";

  const groups: number[] = [];
  for (let rest = amount; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);

  const words: string[] = [];
  let hasHigherGroup = false;
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i];
    if (group === 0) continue;
    words.push(readGroup(group, hasHigherGroup && group < 100));
    if (SCALES[i]) words.push(SCALES[i]);
    hasHigherGroup = true;
  }
  const result = words.join(" ").replace(/\s+/g, " ").trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}
