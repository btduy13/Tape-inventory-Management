// Icon-only button / link. The label is the accessible name and the hover tooltip (title).
import Link from "next/link";
import { Icon, type IconName } from "./Icon";

export type IconTone = "neutral" | "primary" | "danger" | "done" | "todo";

const TONE: Record<IconTone, string> = {
  neutral: "border-pt-line-strong bg-pt-surface text-pt-text hover:border-vt-blue hover:text-vt-blue",
  primary: "border-vt-blue bg-vt-blue text-white hover:bg-vt-navy",
  danger: "border-pt-red-ink/40 bg-pt-surface text-pt-red-ink hover:bg-pt-red-tint",
  // Status toggles: green = done, red = not done yet.
  done: "border-pt-green-ink/30 bg-pt-green-tint text-pt-green-ink hover:border-pt-green-ink",
  todo: "border-pt-red-ink/30 bg-pt-red-tint text-pt-red-ink hover:border-pt-red-ink",
};

export const iconButtonClass = (tone: IconTone = "neutral", size: "sm" | "md" = "md") =>
  `inline-flex shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-blue disabled:cursor-not-allowed disabled:opacity-50 ${size === "sm" ? "size-9" : "size-11"} ${TONE[tone]}`;

type Common = { icon: IconName; label: string; tone?: IconTone; size?: "sm" | "md"; pressed?: boolean };

export function IconButton({ icon, label, tone, size, pressed, ...rest }: Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} className={iconButtonClass(tone, size)} {...rest}>
      <Icon name={icon} className={size === "sm" ? "size-4.5" : "size-5"} />
    </button>
  );
}

export function IconLink({ icon, label, tone, size, href }: Common & { href: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={iconButtonClass(tone, size)}>
      <Icon name={icon} className={size === "sm" ? "size-4.5" : "size-5"} />
    </Link>
  );
}
