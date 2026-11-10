// Class recipes shared by the kit and by feature forms (Tailwind only, no inline styles: CSP).
// Every interactive control is at least 44px tall on touch screens, 40px from md up (mouse).

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[background-color,box-shadow,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-vt-blue text-white shadow-sm hover:bg-vt-blue-ink",
  secondary: "border border-pt-line-strong bg-pt-surface text-pt-text shadow-xs hover:border-vt-blue hover:text-vt-blue",
  ghost: "text-pt-text hover:bg-pt-grey-tint",
  danger: "bg-vt-red-deep text-white hover:bg-vt-red-dark",
};

// sm keeps the 44px hit area via min-h; only the padding / type shrink.
const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm md:min-h-10",
  sm: "min-h-11 px-3 text-sm md:min-h-9",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = ""): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${extra}`.trim();
}

/** Text inputs, selects, textareas. */
export const inputClass =
  "min-h-11 w-full rounded-lg border border-pt-line-strong bg-pt-surface px-3 py-2 text-sm text-pt-text transition-colors placeholder:text-pt-muted/80 hover:border-pt-muted focus:border-vt-blue md:min-h-10 aria-invalid:border-pt-red-ink disabled:bg-pt-grey-tint";

export const textareaClass = `${inputClass} min-h-24`;

export const checkboxClass = "size-5 rounded border-pt-line-strong accent-vt-blue";

/** Section surface. Radius ladder: controls 8px, surfaces 16px, badges pill. One soft shadow lifts it off the canvas. */
export const surfaceClass = "rounded-2xl border border-pt-line bg-pt-surface shadow-[0_1px_2px_rgb(22_23_58/0.04),0_8px_24px_-16px_rgb(22_23_58/0.18)]";

/** Text link inside content. */
export const linkClass = "font-medium text-vt-blue underline-offset-2 hover:underline";
