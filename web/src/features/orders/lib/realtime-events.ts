// Pure helpers for Supabase Realtime postgres_changes payloads.

export const REALTIME_TABLES = ["leads", "lead_status_log", "lead_notes", "quotes"] as const;
export type RealtimeTable = (typeof REALTIME_TABLES)[number];

export type ChangePayload = {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/** The lead a change belongs to, or null if it cannot be determined. */
export function affectedLeadId(p: ChangePayload): string | null {
  const key = p.table === "leads" ? "id" : "lead_id";
  return str(p.new?.[key]) ?? str(p.old?.[key]);
}

/** True when the current user was just unassigned from the lead (access will disappear). */
export function lostAssignment(p: ChangePayload, userId: string): boolean {
  if (p.table !== "leads") return false;
  if (p.eventType === "DELETE") return str(p.old?.assigned_to) === userId;
  return str(p.old?.assigned_to) === userId && str(p.new?.assigned_to) !== userId;
}

/** Realtime filter for one lead (`id=eq.x` on leads, `lead_id=eq.x` elsewhere). */
export function leadFilter(table: RealtimeTable, leadId: string): string {
  return `${table === "leads" ? "id" : "lead_id"}=eq.${leadId}`;
}
