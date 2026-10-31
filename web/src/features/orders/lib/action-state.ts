export type OrdersActionState = { status: "idle" | "error" | "success"; message?: string };

export const IDLE: OrdersActionState = { status: "idle" };
export const fail = (message: string): OrdersActionState => ({ status: "error", message });
export const ok = (message: string): OrdersActionState => ({ status: "success", message });

/** Maps Postgres / PostgREST error codes raised by RLS, guards and RPCs to a UI category. */
export type DbErrorKind = "forbidden" | "notFound" | "invalid" | "generic";

export function classifyDbError(error: { code?: string | null } | null | undefined): DbErrorKind {
  switch (error?.code) {
    case "42501":
      return "forbidden";
    case "P0002":
    case "PGRST116":
      return "notFound";
    case "22023":
    case "23514":
    case "22P02":
      return "invalid";
    default:
      return "generic";
  }
}
