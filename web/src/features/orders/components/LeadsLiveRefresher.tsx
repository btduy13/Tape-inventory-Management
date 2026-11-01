"use client";
// Pages that summarise all leads (e.g. the /admin status counts): refresh on any lead change.
import { useLeadRealtime } from "./useLeadRealtime";

export function LeadsLiveRefresher() {
  useLeadRealtime({});
  return null;
}
