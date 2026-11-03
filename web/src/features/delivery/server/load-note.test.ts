// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { DeliveryNoteView } from "../lib/token";
import type { DeliveryDeps } from "./deps";

vi.mock("./deps", () => ({
  DELIVERY_RATE_LIMITS: { view: { name: "delivery-view", windowSeconds: 300, maxHits: 60 } },
  createDeliveryDeps: () => {
    throw new Error("real deps must not be built in tests");
  },
}));

const { loadDeliveryNote } = await import("./load-note");

const TOKEN = "b".repeat(43);
const note: DeliveryNoteView = {
  noteId: "n1",
  orderName: "Băng keo in ABC",
  quantity: 50,
  recipientName: "Chị Lan",
  status: "open",
  jobReady: true,
  confirmedAt: null,
};

function deps(over: Partial<DeliveryDeps> = {}) {
  const d: DeliveryDeps = {
    allowIp: vi.fn(async () => true),
    allowToken: vi.fn(async () => true),
    findNote: vi.fn(async () => note),
    upload: vi.fn(async () => true),
    remove: vi.fn(async () => undefined),
    confirm: vi.fn(async () => ({ ok: true, confirmedAt: "x" }) as const),
    ...over,
  };
  return { d, deps: () => d };
}

describe("loadDeliveryNote", () => {
  it("is rate limited per IP before any lookup", async () => {
    const { d, deps: f } = deps({ allowIp: vi.fn(async () => false) });
    expect(await loadDeliveryNote(TOKEN, new Headers(), f)).toEqual({ access: "rate_limited" });
    expect(d.findNote).not.toHaveBeenCalled();
  });

  it("invalid for malformed or unknown tokens", async () => {
    const malformed = deps();
    expect(await loadDeliveryNote("nope", new Headers(), malformed.deps)).toEqual({ access: "invalid" });
    expect(malformed.d.findNote).not.toHaveBeenCalled();
    const unknown = deps({ findNote: vi.fn(async () => null) });
    expect(await loadDeliveryNote(TOKEN, new Headers(), unknown.deps)).toEqual({ access: "invalid" });
  });

  it("looks the note up by sha256 hash and returns its access", async () => {
    const { d, deps: f } = deps();
    expect(await loadDeliveryNote(TOKEN, new Headers(), f)).toEqual({ access: "capture", note });
    expect(d.findNote).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{64}$/));
  });

  it("confirmed notes are read-only", async () => {
    const confirmed = { ...note, status: "confirmed" as const, confirmedAt: "2026-11-03T03:00:00Z" };
    const { deps: f } = deps({ findNote: vi.fn(async () => confirmed) });
    expect((await loadDeliveryNote(TOKEN, new Headers(), f)).access).toBe("confirmed");
  });
});
