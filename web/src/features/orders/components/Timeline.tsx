import { getDictionary } from "@/i18n";
import { formatDateTime, type TimelineEntry } from "../lib/timeline";

const t = getDictionary();

export function Timeline({ entries, names }: { entries: TimelineEntry[]; names: Record<string, string> }) {
  if (entries.length === 0) return <p className="text-sm text-neutral-500">{t.common.none}</p>;
  const who = (id: string | null) => (id ? names[id] || "—" : t.orders.system);
  return (
    <ol className="flex flex-col gap-3 border-l border-neutral-200 pl-4">
      {entries.map((e) => (
        <li key={e.key} className="relative text-sm">
          <span className={`absolute -left-[21px] top-1.5 size-2.5 rounded-full ${e.kind === "status" ? "bg-amber-600" : "bg-neutral-400"}`} aria-hidden />
          <div className="text-xs text-neutral-500">
            {formatDateTime(e.at)} · {who(e.actorId)}
          </div>
          {e.kind === "status" ? (
            <div>
              <span className="font-medium">
                {e.from ? `${t.leadStatus[e.from]} → ${t.leadStatus[e.to]}` : `${t.orders.created} (${t.leadStatus[e.to]})`}
              </span>
              {e.note && <p className="mt-1 whitespace-pre-wrap text-neutral-700">{e.note}</p>}
            </div>
          ) : (
            <p className="whitespace-pre-wrap rounded-md bg-neutral-50 p-2 text-neutral-800">{e.body}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
