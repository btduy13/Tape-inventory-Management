// Page building blocks: header with breadcrumbs + primary action slot, sections, stat cards.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import type { Tone } from "../lib/status-tones";
import { TONE_DOT } from "../lib/status-tones";
import { Icon } from "./Icon";
import { surfaceClass } from "./styles";

const p = getDictionary().portalUi;

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={p.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-pt-muted">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <Icon name="chevronRight" className="size-3.5" />}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="inline-flex min-h-11 items-center hover:text-vt-blue hover:underline">{c.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-pt-text">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

type PageHeaderProps = {
  title: string;
  /** One line under the title (what this page is for). */
  description?: string;
  breadcrumbs?: readonly Crumb[];
  /** Primary action(s), right-aligned on desktop, full width on phones. */
  actions?: React.ReactNode;
  /** Small things next to the title (status badge, live indicator). */
  meta?: React.ReactNode;
};

export function PageHeader({ title, description, breadcrumbs, actions, meta }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-pt-text sm:text-[1.75rem]">{title}</h1>
            {meta}
          </div>
          {description && <p className="max-w-prose text-sm text-pt-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
      </div>
    </header>
  );
}

type SectionProps = {
  title?: string;
  description?: string;
  /** Buttons in the section header. */
  actions?: React.ReactNode;
  /** `plain` drops the surface (for sections that hold their own cards / tables). */
  variant?: "surface" | "plain";
  id?: string;
  className?: string;
  children: React.ReactNode;
};

export function Section({ title, description, actions, variant = "surface", id, className = "", children }: SectionProps) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={`${variant === "surface" ? `${surfaceClass} p-4 sm:p-5` : ""} flex flex-col gap-4 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {title && <h2 id={headingId} className="text-base font-semibold text-pt-text">{title}</h2>}
            {description && <p className="text-sm text-pt-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: number | string;
  /** Makes the whole card a link (e.g. to the filtered list). */
  href?: string;
  tone?: Tone;
  /** Small text under the value. */
  hint?: string;
};

export function StatCard({ label, value, href, tone, hint }: StatCardProps) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pt-muted">
        {tone && <span aria-hidden className={`size-2 rounded-full ${TONE_DOT[tone]}`} />}
        {label}
      </span>
      <span className="text-2xl font-bold leading-none tracking-tight text-pt-text sm:text-3xl">{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</span>
      {hint && <span className="text-xs text-pt-muted">{hint}</span>}
    </>
  );
  const cls = `${surfaceClass} flex min-h-24 flex-col justify-between gap-2 p-4`;
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-vt-blue`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 [&>*]:min-w-0">
      {children}
    </div>
  );
}
