import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { createOrder } from "./mutations";

function db(result: { data?: unknown; error?: { code: string } | null }) {
  const single = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  const rpc = vi.fn(() => ({ single }));
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("createOrder", () => {
  it("calls admin_order_create with the payload and returns the new ids", async () => {
    const { client, rpc } = db({ data: { order_id: "BK-11-26-001", job_id: "j1" } });
    expect(await createOrder(client, { ten_hang: "A", so_luong: 1 })).toEqual({ ok: true, orderId: "BK-11-26-001", jobId: "j1" });
    expect(rpc).toHaveBeenCalledWith("admin_order_create", { p_payload: { ten_hang: "A", so_luong: 1 } });
  });

  it("maps SQL errors", async () => {
    expect(await createOrder(db({ error: { code: "42501" } }).client, {})).toEqual({ ok: false, reason: "forbidden" });
    expect(await createOrder(db({ error: { code: "22023" } }).client, {})).toEqual({ ok: false, reason: "invalid" });
    expect(await createOrder(db({ error: { code: "XX000" } }).client, {})).toEqual({ ok: false, reason: "generic" });
    expect(await createOrder(db({ data: null }).client, {})).toEqual({ ok: false, reason: "generic" });
  });
});
