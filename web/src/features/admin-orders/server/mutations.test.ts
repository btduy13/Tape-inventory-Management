import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { convertQuote, createOrder, deleteOrders, sendToWorkshop, setStatus, updateOrder } from "./mutations";

function db(result: { data?: unknown; error?: { code: string } | null }) {
  const res = { data: result.data ?? null, error: result.error ?? null };
  const single = vi.fn().mockResolvedValue(res);
  // rpc() is awaitable directly and has .single() (PostgREST builder).
  const rpc = vi.fn(() => Object.assign(Promise.resolve(res), { single }));
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("createOrder", () => {
  it("calls admin_order_create with type and quote flag and returns the new ids", async () => {
    const { client, rpc } = db({ data: { order_id: "BK-11-26-001", job_id: "j1" } });
    expect(await createOrder(client, { ten_hang: "A", so_luong: 1 })).toEqual({ ok: true, orderId: "BK-11-26-001", jobId: "j1" });
    expect(rpc).toHaveBeenCalledWith("admin_order_create", { p_payload: { ten_hang: "A", so_luong: 1 }, p_type: "bang_keo_in", p_is_quote: false });
    await createOrder(client, {}, "thank_you", true);
    expect(rpc).toHaveBeenLastCalledWith("admin_order_create", { p_payload: {}, p_type: "thank_you", p_is_quote: true });
  });

  it("maps SQL errors", async () => {
    expect(await createOrder(db({ error: { code: "42501" } }).client, {})).toEqual({ ok: false, reason: "forbidden" });
    expect(await createOrder(db({ error: { code: "22023" } }).client, {})).toEqual({ ok: false, reason: "invalid" });
    expect(await createOrder(db({ error: { code: "XX000" } }).client, {})).toEqual({ ok: false, reason: "generic" });
    expect(await createOrder(db({ data: null }).client, {})).toEqual({ ok: false, reason: "generic" });
  });
});

describe("order RPC wrappers", () => {
  it("setStatus sends only the flags that change", async () => {
    const { client, rpc } = db({ data: 2 });
    expect(await setStatus(client, "bang_keo", ["B-1", "B-2"], true, null)).toEqual({ ok: true, count: 2 });
    expect(rpc).toHaveBeenCalledWith("admin_order_set_status", { p_type: "bang_keo", p_ids: ["B-1", "B-2"], p_da_giao: true });
    await setStatus(client, "truc_in", ["TI-1"], null, false);
    expect(rpc).toHaveBeenLastCalledWith("admin_order_set_status", { p_type: "truc_in", p_ids: ["TI-1"], p_da_tat_toan: false });
  });

  it("update, delete, convert and send-to-workshop pass their args and map errors", async () => {
    const ok = db({ data: "TY-11-26-009" });
    expect(await updateOrder(ok.client, "thank_you", "TY-1", { so_luong: 3, ghi_chu: null })).toEqual({ ok: true });
    expect(ok.rpc).toHaveBeenLastCalledWith("admin_order_update", { p_type: "thank_you", p_id: "TY-1", p_payload: { so_luong: 3, ghi_chu: null } });
    expect(await convertQuote(ok.client, "thank_you", "BG-TY-1", "2026-11-10")).toEqual({ ok: true, id: "TY-11-26-009" });
    expect(ok.rpc).toHaveBeenLastCalledWith("admin_quote_convert", { p_type: "thank_you", p_id: "BG-TY-1", p_ngay_du_kien: "2026-11-10" });
    await sendToWorkshop(ok.client, "BK-1", null);
    expect(ok.rpc).toHaveBeenLastCalledWith("admin_order_send_to_workshop", { p_id: "BK-1" });
    await deleteOrders(ok.client, "bang_keo_in", ["BG-BK-1"], true);
    expect(ok.rpc).toHaveBeenLastCalledWith("admin_order_delete", { p_type: "bang_keo_in", p_ids: ["BG-BK-1"], p_quote_only: true });
    expect(await updateOrder(db({ error: { code: "P0002" } }).client, "bang_keo", "x", {})).toEqual({ ok: false, reason: "notFound" });
    expect(await sendToWorkshop(db({ error: { code: "22023" } }).client, "BK-1", null)).toEqual({ ok: false, reason: "invalid" });
  });
});
