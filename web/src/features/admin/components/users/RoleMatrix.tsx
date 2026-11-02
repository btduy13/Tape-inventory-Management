// "Who can do what" table. Display only: built from ROLE_GROUPS (lib/permissions.ts);
// the real checks are requireRole / server actions / RLS.
import { getDictionary } from "@/i18n";
import { ROLES } from "@/lib/types";
import { Icon } from "@/features/portal-ui/components/Icon";
import { CAPABILITY_KEY, PERMISSION_MATRIX, type Access } from "../../lib/permissions";

const t = getDictionary();
const a = t.adminUi;

const CELL: Record<Access, { label: string; cls: string }> = {
  all: { label: a.accessAll, cls: "bg-pt-green-tint text-pt-green-ink" },
  own: { label: a.accessOwn, cls: "bg-pt-blue-tint text-pt-blue-ink" },
  none: { label: a.accessNone, cls: "text-pt-muted" },
};

function AccessCell({ access }: { access: Access }) {
  const c = CELL[access];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.cls}`}>
      {access === "all" && <Icon name="check" className="size-3.5" />}
      {access === "none" ? <span aria-hidden>–</span> : null}
      <span className={access === "none" ? "sr-only" : ""}>{c.label}</span>
    </span>
  );
}

export function RoleMatrix() {
  return (
    // tabIndex: scrolls sideways on narrow screens; keyboard users need focus to scroll it (WCAG 2.1.1).
    <div role="region" aria-label={a.matrixCaption} tabIndex={0} className="relative -mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">{a.matrixCaption}</caption>
        <thead className="border-b border-pt-line text-xs text-pt-muted">
          <tr>
            <th scope="col" className="sticky left-0 bg-pt-surface px-4 py-3 font-semibold sm:px-5">{a.capability}</th>
            {ROLES.map((r) => (
              <th key={r} scope="col" className="px-3 py-3 text-center font-semibold">{t.roles[r]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MATRIX.map((row) => (
            <tr key={row.capability} className="border-t border-pt-line first:border-t-0">
              <th scope="row" className="sticky left-0 bg-pt-surface px-4 py-2.5 font-medium text-pt-text sm:px-5">{a[CAPABILITY_KEY[row.capability]]}</th>
              {ROLES.map((r) => (
                <td key={r} className="px-3 py-2.5 text-center"><AccessCell access={row.access[r]} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
