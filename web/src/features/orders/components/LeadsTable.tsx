"use client";
import Link from "next/link";
import { useCallback } from "react";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import type { LeadListItem } from "../server/queries";
import { affectedLeadId, type ChangePayload } from "../lib/realtime-events";
import { formatDateTime } from "../lib/timeline";
import { StatusBadge } from "./StatusBadge";
import { UnreadBadge } from "./UnreadBadge";
import { useLeadRealtime } from "./useLeadRealtime";
import { useUnread } from "./useUnread";

const t = getDictionary();

type Props = {
  leads: LeadListItem[];
  /** Link target per lead; defaults to the portal detail page. */
  hrefFor?: "portal" | "admin";
};

export function LeadsTable({ leads, hrefFor = "portal" }: Props) {
  const { unreadIds, count, markLive, markRead } = useUnread(leads);
  const onChange = useCallback(
    (p: ChangePayload) => {
      const id = affectedLeadId(p);
      if (id) markLive(id);
    },
    [markLive],
  );
  useLeadRealtime({ onChange });

  const href = (id: string) => (hrefFor === "admin" ? ROUTES.adminLead(id) : ROUTES.portalLead(id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <span className="inline-block size-2 rounded-full bg-green-500" aria-hidden />
        {t.orders.live}
        <UnreadBadge count={count} />
      </div>
      {leads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">{t.orders.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">{t.orders.code}</th>
                <th className="px-3 py-2 font-medium">{t.orders.customer}</th>
                <th className="px-3 py-2 font-medium">{t.orders.status}</th>
                <th className="px-3 py-2 font-medium">{t.orders.assignee}</th>
                <th className="px-3 py-2 font-medium">{t.orders.updatedAt}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const unread = unreadIds.has(lead.id);
                return (
                  <tr key={lead.id} className={`border-t border-neutral-100 ${unread ? "bg-amber-50" : ""}`}>
                    <td className="px-3 py-2 font-mono">
                      <Link href={href(lead.id)} onClick={() => markRead(lead.id)} className="text-amber-800 hover:underline">
                        {lead.code}
                      </Link>
                      {unread && <span className="ml-2 rounded bg-red-600 px-1.5 text-[10px] font-semibold text-white">{t.orders.newBadge}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{lead.customer_name}</div>
                      <div className="text-xs text-neutral-500">{[lead.company, lead.phone].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={lead.status} /></td>
                    <td className="px-3 py-2">{lead.assigneeName ?? (lead.assigned_to ? "—" : t.assignment.unassigned)}</td>
                    <td className="px-3 py-2 text-neutral-600">{formatDateTime(lead.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
