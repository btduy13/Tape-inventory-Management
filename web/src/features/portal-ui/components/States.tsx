// Empty / error / loading states and inline action status. Errors say what happened and what to do.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { Icon } from "./Icon";
import { buttonClass } from "./styles";

const t = getDictionary();
const p = t.portalUi;

export function EmptyState({ title = p.emptyTitle, body, action }: { title?: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-pt-line-strong bg-pt-surface px-6 py-10 text-center">
      <p className="text-base font-semibold text-pt-text">{title}</p>
      {body && <p className="max-w-prose text-sm text-pt-muted">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = p.errorTitle, body, action }: { title?: string; body?: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-xl border border-pt-red-ink/30 bg-pt-red-tint px-5 py-4 text-pt-red-ink">
      <p className="flex items-center gap-2 font-semibold"><Icon name="alert" />{title}</p>
      {body && <p className="text-sm">{body}</p>}
      {action}
    </div>
  );
}

/** 404 inside the portal shell (missing record or hidden by RLS); links back to the role's home. */
export function NotFoundState({ homeHref }: { homeHref: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-pt-line bg-pt-surface px-6 py-12 text-center">
      <p className="text-4xl font-bold text-vt-blue">404</p>
      <h1 className="text-xl font-semibold text-pt-text">{t.common.notFoundTitle}</h1>
      <p className="max-w-prose text-sm text-pt-muted">{t.common.notFoundBody}</p>
      <Link href={homeHref} className={buttonClass("primary")}>{p.backHome}</Link>
    </div>
  );
}

/** Skeleton rows for route-level loading.tsx files. */
export function LoadingState({ rows = 5, label = p.loading }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="pt-skeleton h-12 rounded-lg" />)}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export type InlineTone = "success" | "error" | "info";

const INLINE: Record<InlineTone, { cls: string; icon: "check" | "alert" | "info" }> = {
  success: { cls: "bg-pt-green-tint text-pt-green-ink", icon: "check" },
  error: { cls: "bg-pt-red-tint text-pt-red-ink", icon: "alert" },
  info: { cls: "bg-pt-blue-tint text-pt-blue-ink", icon: "info" },
};

/** Result line under a form. Errors are announced assertively, the rest politely. */
export function InlineStatus({ tone, children }: { tone: InlineTone; children: React.ReactNode }) {
  const s = INLINE[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium ${s.cls}`}>
      <Icon name={s.icon} className="mt-0.5 size-4" />
      <span>{children}</span>
    </p>
  );
}

/** Adapter for the `{ status, message }` action states used by every feature. */
export function ActionStatus({ state }: { state: { status: string; message?: string | null } }) {
  if (!state.message || (state.status !== "success" && state.status !== "error" && state.status !== "ok")) return null;
  return <InlineStatus tone={state.status === "error" ? "error" : "success"}>{state.message}</InlineStatus>;
}
