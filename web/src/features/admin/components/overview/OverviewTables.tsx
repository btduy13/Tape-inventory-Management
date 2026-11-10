// Two 5-row tables: most overdue orders, largest open customer debts. "Xem tất cả" opens the list.
import Link from "next/link";
import { formatVnd } from "@/i18n";
import { Section, linkClass } from "@/features/portal-ui";
import { dateVn, vndShort } from "@/features/admin-orders/lib/format";
import { orderHref } from "@/features/admin-orders/lib/paths";
import { dashboardCopy as c } from "../../lib/copy";
import { ordersHref, type Overview } from "../../lib/overview";

const th = "py-2 font-medium text-pt-muted";
const td = "py-2.5";

function SeeAll({ href }: { href: string }) {
  return <Link href={href} className={`${linkClass} inline-flex min-h-11 items-center text-sm`}>{c.seeAll}</Link>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg bg-pt-grey-tint px-3 py-4 text-sm text-pt-muted">{text}</p>;
}

export function OverdueTable({ rows }: { rows: Overview["overdueList"] }) {
  return (
    <Section id="qua-han" title={c.overdueTitle} actions={<SeeAll href={ordersHref({ type: "all", due: "overdue", sort: "ngay_du_kien", dir: "asc" })} />}>
      {rows.length === 0 ? <Empty text={c.overdueEmpty} /> : (
        <table className="w-full table-fixed text-sm">
          <thead className="border-b border-pt-line text-left">
            <tr>
              <th scope="col" className={`${th} w-[30%]`}>{c.colId}</th>
              <th scope="col" className={th}>{c.colCustomer}</th>
              <th scope="col" className={`${th} hidden w-[24%] sm:table-cell`}>{c.colDue}</th>
              <th scope="col" className={`${th} w-[22%] text-right`}>{c.colLate}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pt-line">
            {rows.map((r) => (
              <tr key={`${r.type}-${r.id}`}>
                <td className={`${td} truncate`}><Link href={orderHref(r.type, r.id)} className={linkClass}>{r.id}</Link></td>
                <td className={`${td} truncate pr-2`}>{r.customer || "—"}</td>
                <td className={`${td} hidden text-pt-muted sm:table-cell`}>{dateVn(r.due)}</td>
                <td className={`${td} text-right font-semibold text-pt-red-ink`}>{c.lateDays(r.daysLate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

export function DebtorsTable({ rows }: { rows: Overview["topDebtors"] }) {
  const unsettled = { type: "all", settled: "0" };
  return (
    <Section id="khach-no" title={c.debtorsTitle} actions={<SeeAll href={ordersHref({ ...unsettled, sort: "cong_no_khach", dir: "desc" })} />}>
      {rows.length === 0 ? <Empty text={c.debtorsEmpty} /> : (
        <table className="w-full table-fixed text-sm">
          <thead className="border-b border-pt-line text-left">
            <tr>
              <th scope="col" className={th}>{c.colCustomer}</th>
              <th scope="col" className={`${th} w-[20%] text-right`}>{c.colOrders}</th>
              <th scope="col" className={`${th} w-[30%] text-right`}>{c.colDebt}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pt-line">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className={`${td} truncate pr-2`}>
                  <Link href={ordersHref({ ...unsettled, q: r.name })} className={linkClass}>{r.name}</Link>
                </td>
                <td className={`${td} text-right text-pt-muted`}>{r.orders}</td>
                <td className={`${td} text-right font-semibold`} title={formatVnd(Math.round(r.debt))}>{vndShort(r.debt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
