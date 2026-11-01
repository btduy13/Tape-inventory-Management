import { describe, expect, it, vi } from "vitest";
import { FakeSender, quoteLinks } from "../lib/fake-sender";
import { ResendSender, type ResendLike } from "./resend-sender";

const msg = { to: ["a@b.vn"], subject: "S\nX", html: "<p>h</p>", text: "h" };

describe("FakeSender", () => {
  it("records messages and returns ids", async () => {
    const s = new FakeSender();
    expect(await s.send(msg)).toEqual({ ok: true, id: "fake-1" });
    expect(s.sent).toHaveLength(1);
    s.clear();
    expect(s.sent).toHaveLength(0);
  });
  it("can simulate failure", async () => {
    expect(await new FakeSender({ failWith: "down" }).send(msg)).toEqual({ ok: false, error: "down" });
  });
});

describe("ResendSender", () => {
  function mockClient(result: Awaited<ReturnType<ResendLike["emails"]["send"]>>) {
    const send = vi.fn().mockResolvedValue(result);
    return { client: { emails: { send } } as ResendLike, send };
  }

  it("maps message to Resend payload", async () => {
    const { client, send } = mockClient({ data: { id: "r1" }, error: null });
    const s = new ResendSender("key", "Shop <a@shop.vn>", client);
    const res = await s.send({
      ...msg,
      attachments: [{ filename: "q.pdf", content: new Uint8Array([1, 2]), contentType: "application/pdf" }],
    });
    expect(res).toEqual({ ok: true, id: "r1" });
    const payload = send.mock.calls[0][0];
    expect(payload.from).toBe("Shop <a@shop.vn>");
    expect(payload.subject).toBe("S X");
    expect(payload.attachments[0].filename).toBe("q.pdf");
    expect(Buffer.isBuffer(payload.attachments[0].content)).toBe(true);
  });

  it("returns error result instead of throwing", async () => {
    const { client } = mockClient({ data: null, error: { message: "invalid" } });
    expect(await new ResendSender("k", "f", client).send(msg)).toEqual({ ok: false, error: "invalid" });

    const throwing = { emails: { send: vi.fn().mockRejectedValue(new Error("net")) } } as ResendLike;
    expect(await new ResendSender("k", "f", throwing).send(msg)).toEqual({ ok: false, error: "net" });
  });

  it("refuses empty recipient list", async () => {
    const { client, send } = mockClient({ data: { id: "x" }, error: null });
    expect((await new ResendSender("k", "f", client).send({ ...msg, to: [] })).ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("quoteLinks", () => {
  it("extracts /q/<token> links only, deduplicated", () => {
    const t = "x".repeat(40);
    const text = `a https://shop.vn/q/${t} b https://shop.vn/q/${t} c https://shop.vn/portal d /q/short`;
    expect(quoteLinks(text)).toEqual([`https://shop.vn/q/${t}`]);
  });

  it("FakeSender does not log links unless logLinks is set", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await new FakeSender({ log: true }).send({ to: ["a@b.vn"], subject: "s", html: "", text: `https://x.vn/q/${"b".repeat(40)}` });
    expect(info.mock.calls.flat().some((l) => String(l).includes("/q/"))).toBe(false);
  });
});
