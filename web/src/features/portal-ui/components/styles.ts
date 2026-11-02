// Class recipes shared by the kit and by feature forms (Tailwind only, no inline styles: CSP).
// Every interactive control is at least 44px tall.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-vt-blue text-white hover:bg-vt-blue-ink",
  secondary: "border border-pt-line-strong bg-pt-surface text-pt-text hover:bg-pt-grey-tint",
  ghost: "text-pt-text hover:bg-pt-grey-tint",
  danger: "bg-vt-red-deep text-white hover:bg-vt-red-dark",
};

// sm keeps the 44px hit area via min-h; only the padding / type shrink.
const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm",
  sm: "min-h-11 px-3 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = ""): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${extra}`.trim();
}

/** Text inputs, selects, textareas. */
export const inputClass =
  "min-h-11 w-full rounded-lg border border-pt-line-strong bg-pt-surface px-3 py-2 text-sm text-pt-text placeholder:text-pt-muted focus:border-vt-blue aria-invalid:border-pt-red-ink disabled:bg-pt-grey-tint";

export const textareaClass = `${inputClass} min-h-24`;

export const checkboxClass = "size-5 rounded border-pt-line-strong accent-vt-blue";

/** Section surface. Radius ladder: controls 8px, surfaces 12px, badges pill. */
export const surfaceClass = "rounded-xl border border-pt-line bg-pt-surface";

/** Text link inside content. */
export const linkClass = "font-medium text-vt-blue underline-offset-2 hover:underline";
