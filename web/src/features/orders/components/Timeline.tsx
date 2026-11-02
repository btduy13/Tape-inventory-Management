import { getDictionary } from "@/i18n";
import { StatusBadge } from "@/features/portal-ui";
import { formatDateTime, type TimelineEntry } from "../lib/timeline";

const t = getDictionary();

/** Newest first: status changes (badges) and internal notes, with who and when. */
export function Timeline({ entries, names }: { entries: TimelineEntry[]; names: Record<string, string> }) {
  if (entries.length === 0) return <p className="text-sm text-pt-muted">{t.common.none}</p>;
  const who = (id: string | null) => (id ? names[id] || "—" : t.orders.system);
  return (
    <ol className="flex flex-col">
      {entries.map((e) => (
        <li key={e.key} className="relative border-l-2 border-pt-line pb-4 pl-5 last:pb-0">
          <span aria-hidden className={`absolute -left-[7px] top-1.5 size-3 rounded-full border-2 border-pt-surface ${e.kind === "status" ? "bg-vt-blue" : "bg-pt-line-strong"}`} />
          <p className="text-xs text-pt-muted">
            <time dateTime={e.at}>{formatDateTime(e.at)}</time>, {who(e.actorId)}
          </p>
          {e.kind === "status" ? (
            <div className="mt-1 flex flex-col gap-1">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {e.from ? (
                  <>
                    <StatusBadge status={e.from} />
                    <span className="text-pt-muted">→</span>
                    <StatusBadge status={e.to} />
                  </>
                ) : (
                  <>
                    <span className="font-medium">{t.orders.created}</span>
                    <StatusBadge status={e.to} />
                  </>
                )}
              </p>
              {e.note && <p className="whitespace-pre-wrap text-sm text-pt-text">{e.note}</p>}
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-pt-canvas p-3 text-sm text-pt-text">{e.body}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
