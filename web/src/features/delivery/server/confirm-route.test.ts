// @vitest-environment node
// POST /api/giao/[token]: guards, rate limits, note state, photo check, upload + confirm.
import { describe, expect, it, vi, type Mock } from "vitest";
import type { DeliveryNoteView } from "../lib/token";
import type { DeliveryDeps } from "./deps";

const photo = vi.hoisted(() => ({
  result: { ok: true, jpeg: Buffer.from("jpeg") } as
    | { ok: true; jpeg: Buffer }
    | { ok: false; error: "not_image" | "too_small" | "blank" },
}));
vi.mock("./photo", () => ({
  MAX_PHOTO_BYTES: 1024,
  processDeliveryPhoto: vi.fn(async () => photo.result),
}));
vi.mock("./deps", () => ({
  DELIVERY_RATE_LIMITS: { confirmIp: { name: "delivery-confirm", windowSeconds: 3600, maxHits: 20 } },
  createDeliveryDeps: () => {
    throw new Error("real deps must not be built in tests");
  },
}));

const { handleConfirmRequest, readBytesCapped } = await import("./confirm-route");
const { processDeliveryPhoto } = await import("./photo");

const TOKEN = "A".repeat(43);
const URL_ = `https://bangkeo.test/api/giao/${TOKEN}`;
const NOTE_ID = "11111111-1111-4111-8111-111111111111";

const openNote: DeliveryNoteView = {
  noteId: NOTE_ID,
  orderName: "Băng keo in logo ABC",
  quantity: 100,
  recipientName: "Anh Minh",
  status: "open",
  jobReady: true,
  confirmedAt: null,
};

function req(body: BodyInit = "img", headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: "POST",
    body,
    headers: { origin: "https://bangkeo.test", "content-type": "image/jpeg", ...headers },
  });
}

type MockDeps = { [K in keyof DeliveryDeps]: Mock<DeliveryDeps[K]> };

function fakeDeps(over: Partial<MockDeps> = {}) {
  const d: MockDeps = {
    allowIp: vi.fn<DeliveryDeps["allowIp"]>(async () => true),
    allowToken: vi.fn<DeliveryDeps["allowToken"]>(async () => true),
    findNote: vi.fn<DeliveryDeps["findNote"]>(async () => openNote),
    upload: vi.fn<DeliveryDeps["upload"]>(async () => true),
    remove: vi.fn<DeliveryDeps["remove"]>(async () => undefined),
    confirm: vi.fn<DeliveryDeps["confirm"]>(async () => ({ ok: true, confirmedAt: "2026-11-03T03:00:00Z" })),
    ...over,
  };
  return { d, deps: () => d };
}

const errorOf = async (res: Response) => ((await res.json()) as { error?: string }).error;

describe("handleConfirmRequest guards", () => {
  const never = () => {
    throw new Error("deps must not be built");
  };

  it("rejects cross-site posts", async () => {
    const res = await handleConfirmRequest(req("x", { origin: "https://evil.test" }), TOKEN, never);
    expect(res.status).toBe(403);
  });

  it("rejects malformed tokens without touching the DB", async () => {
    const res = await handleConfirmRequest(req(), "short", never);
    expect(res.status).toBe(404);
  });

  it("rejects non-image bodies", async () => {
    const res = await handleConfirmRequest(req("{}", { "content-type": "application/json" }), TOKEN, never);
    expect(res.status).toBe(415);
  });

  it("rate limits per IP and per token", async () => {
    const ip = fakeDeps({ allowIp: vi.fn<DeliveryDeps["allowIp"]>(async () => false) });
    expect((await handleConfirmRequest(req(), TOKEN, ip.deps)).status).toBe(429);
    const tok = fakeDeps({ allowToken: vi.fn<DeliveryDeps["allowToken"]>(async () => false) });
    expect((await handleConfirmRequest(req(), TOKEN, tok.deps)).status).toBe(429);
    expect(tok.d.findNote).not.toHaveBeenCalled();
  });

  it("rejects bodies over the cap (413) before any lookup", async () => {
    const { d, deps } = fakeDeps();
    const res = await handleConfirmRequest(req("x".repeat(2048)), TOKEN, deps);
    expect(res.status).toBe(413);
    expect(d.findNote).not.toHaveBeenCalled();
  });
});

describe("handleConfirmRequest note state", () => {
  it.each([
    [{ status: "confirmed" as const }, 409, "already_confirmed"],
    [{ status: "revoked" as const }, 410, "replaced"],
    [{ jobReady: false }, 409, "not_ready"],
  ])("refuses %o without decoding or uploading", async (patch, status, error) => {
    const { d, deps } = fakeDeps({ findNote: vi.fn<DeliveryDeps["findNote"]>(async () => ({ ...openNote, ...patch })) });
    const res = await handleConfirmRequest(req(), TOKEN, deps);
    expect(res.status).toBe(status);
    expect(await errorOf(res)).toBe(error);
    expect(processDeliveryPhoto).not.toHaveBeenCalled();
    expect(d.upload).not.toHaveBeenCalled();
  });

  it("404 for an unknown token", async () => {
    const { deps } = fakeDeps({ findNote: vi.fn<DeliveryDeps["findNote"]>(async () => null) });
    expect((await handleConfirmRequest(req(), TOKEN, deps)).status).toBe(404);
  });
});

describe("handleConfirmRequest photo + confirm", () => {
  it("bad photo: 422 with the reason, nothing uploaded or locked", async () => {
    photo.result = { ok: false, error: "blank" };
    try {
      const { d, deps } = fakeDeps();
      const res = await handleConfirmRequest(req(), TOKEN, deps);
      expect(res.status).toBe(422);
      expect(await errorOf(res)).toBe("blank");
      expect(d.upload).not.toHaveBeenCalled();
      expect(d.confirm).not.toHaveBeenCalled();
    } finally {
      photo.result = { ok: true, jpeg: Buffer.from("jpeg") };
    }
  });

  it("uploads under <note_id>/<random>.jpg, then confirms", async () => {
    const { d, deps } = fakeDeps();
    const res = await handleConfirmRequest(req(), TOKEN, deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, confirmedAt: "2026-11-03T03:00:00Z" });
    const [path] = d.upload.mock.calls[0]!;
    expect(path).toMatch(new RegExp(`^${NOTE_ID}/[A-Za-z0-9_-]{1,80}\\.jpg$`));
    const [hash, confirmedPath] = d.confirm.mock.calls[0]!;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(confirmedPath).toBe(path);
    expect(d.remove).not.toHaveBeenCalled();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("upload failure: 500 and no confirm", async () => {
    const { d, deps } = fakeDeps({ upload: vi.fn<DeliveryDeps["upload"]>(async () => false) });
    expect((await handleConfirmRequest(req(), TOKEN, deps)).status).toBe(500);
    expect(d.confirm).not.toHaveBeenCalled();
  });

  it.each([
    ["already_confirmed", 409],
    ["replaced", 410],
    ["not_ready", 409],
    ["not_found", 404],
    ["server_error", 500],
  ] as const)("confirm error %s deletes the uploaded photo", async (error, status) => {
    const { d, deps } = fakeDeps({ confirm: vi.fn<DeliveryDeps["confirm"]>(async () => ({ ok: false, error })) });
    const res = await handleConfirmRequest(req(), TOKEN, deps);
    expect(res.status).toBe(status);
    expect(await errorOf(res)).toBe(error);
    expect(d.remove).toHaveBeenCalledWith(d.upload.mock.calls[0]![0]);
  });

  it("a throwing confirm still deletes the photo", async () => {
    const { d, deps } = fakeDeps({
      confirm: vi.fn<DeliveryDeps["confirm"]>(async () => {
        throw new Error("network");
      }),
    });
    expect((await handleConfirmRequest(req(), TOKEN, deps)).status).toBe(500);
    expect(d.remove).toHaveBeenCalledTimes(1);
  });
});

describe("readBytesCapped", () => {
  it("rejects a declared length over the cap before reading", async () => {
    expect(await readBytesCapped(req("x", { "content-length": "999999" }), 10)).toBeNull();
  });

  it("returns the bytes under the cap", async () => {
    expect((await readBytesCapped(req("hello"), 10))?.toString()).toBe("hello");
  });
});
