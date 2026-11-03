// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: async () => true }));

const { mapConfirmError } = await import("./deps");

describe("mapConfirmError (confirm_delivery errors from migration 0024)", () => {
  it.each([
    [{ code: "P0002", message: "delivery note not found" }, "not_found"],
    [{ code: "55000", message: "delivery note already confirmed" }, "already_confirmed"],
    [{ code: "55000", message: "delivery note was replaced" }, "replaced"],
    [{ code: "55000", message: "job is not ready for delivery" }, "not_ready"],
    [{ code: "22023", message: "photo is missing or has an invalid path" }, "server_error"],
    [{ code: "42501", message: "service role only" }, "server_error"],
    [{}, "server_error"],
  ])("%o -> %s", (err, expected) => {
    expect(mapConfirmError(err)).toBe(expected);
  });
});
