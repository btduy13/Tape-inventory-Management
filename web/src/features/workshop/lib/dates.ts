// Due dates are calendar dates in Vietnam time (bang_keo_in_orders.ngay_du_kien is `date`;
// the SQL hand-off compares with (now() at time zone 'Asia/Ho_Chi_Minh')::date).
import type { ProductionStep } from "@/lib/types";
import { isClosedStep } from "./steps";

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const DEFAULT_DUE_DAYS = 7;
const SOON_DAYS = 2;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today in Vietnam as YYYY-MM-DD. */
export function vnToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** UI default for the hand-off form: today + 7 (Vietnam date). */
export function defaultDueDate(now: Date = new Date()): string {
  return addDays(vnToday(now), DEFAULT_DUE_DAYS);
}

export type DueState = "none" | "overdue" | "today" | "soon" | "ok";

/** Closed jobs (delivered / cancelled) are never shown as overdue. */
export function dueState(dueDate: string | null, step: ProductionStep, now: Date = new Date()): DueState {
  if (!dueDate || !isIsoDate(dueDate)) return "none";
  if (isClosedStep(step)) return "ok";
  const today = vnToday(now);
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate <= addDays(today, SOON_DAYS)) return "soon";
  return "ok";
}

/** YYYY-MM-DD -> DD/MM/YYYY (Vietnamese display). */
export function formatDueDate(isoDate: string | null): string {
  if (!isoDate || !isIsoDate(isoDate)) return "—";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
