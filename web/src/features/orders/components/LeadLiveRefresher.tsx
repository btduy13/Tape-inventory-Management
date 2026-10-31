"use client";
// Detail page: live refresh for one lead + marks it as seen for the list's unread badge.
// When the current user loses access (unassigned), the refresh renders the "not found" state.
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { lostAssignment, type ChangePayload } from "../lib/realtime-events";
import { useLeadRealtime } from "./useLeadRealtime";
import { markLeadSeen } from "./useUnread";

export function LeadLiveRefresher({ leadId, userId, seesAll }: { leadId: string; userId: string; seesAll: boolean }) {
  const router = useRouter();
  useEffect(() => {
    markLeadSeen(leadId);
  }, [leadId]);

  const onChange = useCallback(
    (p: ChangePayload) => {
      markLeadSeen(leadId);
      if (!seesAll && lostAssignment(p, userId)) router.replace(ROUTES.portal);
    },
    [leadId, userId, seesAll, router],
  );
  useLeadRealtime({ leadId, onChange });
  return null;
}
