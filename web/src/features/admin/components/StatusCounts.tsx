import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { LEAD_STATUSES } from "@/lib/types";
import type { StatusCounts as Counts } from "../server/queries";

const t = getDictionary();

export function StatusCounts({ counts }: { counts: Counts }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {LEAD_STATUSES.map((s) => (
        <li key={s}>
          <Link href={`${ROUTES.portal}?status=${s}`} className="flex flex-col rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
            <span className="text-xs text-neutral-500">{t.leadStatus[s]}</span>
            <span className="text-2xl font-semibold">{counts[s]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
