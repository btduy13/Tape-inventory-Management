// One colour per meaning, used by every badge, stepper and stat card in the portal.
// Text labels always accompany colour (never colour alone). All pairs pass WCAG AA.
import type { LeadStatus, ProductionStep } from "@/lib/types";

export type Tone = "red" | "blue" | "yellow" | "green" | "amber" | "grey";

/** Tailwind classes per tone (tokens in globals.css, prefix pt-). */
export const TONE_CLASS: Readonly<Record<Tone, string>> = {
  red: "bg-pt-red-tint text-pt-red-ink",
  blue: "bg-pt-blue-tint text-pt-blue-ink",
  yellow: "bg-pt-yellow-tint text-pt-yellow-ink",
  green: "bg-pt-green-tint text-pt-green-ink",
  amber: "bg-pt-amber-tint text-pt-amber-ink",
  grey: "bg-pt-grey-tint text-pt-grey-ink",
};

/** Dot colour inside badges / stepper marks. */
export const TONE_DOT: Readonly<Record<Tone, string>> = {
  red: "bg-pt-red-ink",
  blue: "bg-pt-blue-ink",
  yellow: "bg-pt-yellow-ink",
  green: "bg-pt-green-ink",
  amber: "bg-pt-amber-ink",
  grey: "bg-pt-grey-ink",
};

/**
 * new = needs someone now (red), sales work = blue, waiting on the customer = yellow,
 * won = green, in the workshop = amber, closed = grey (done keeps green ink).
 */
export const LEAD_TONE: Readonly<Record<LeadStatus, Tone>> = {
  new: "red",
  assigned: "blue",
  consulting: "blue",
  quoted: "yellow",
  accepted: "green",
  production: "amber",
  shipping: "amber",
  done: "green",
  cancelled: "grey",
};

export const STEP_TONE: Readonly<Record<ProductionStep, Tone>> = {
  cho_san_xuat: "grey",
  dang_san_xuat: "amber",
  dang_in: "amber",
  dang_cat_cuon: "amber",
  dong_goi: "amber",
  san_sang_giao: "yellow",
  da_giao: "green",
  huy: "grey",
};

export const isStruck = (s: LeadStatus | ProductionStep) => s === "cancelled" || s === "huy";
