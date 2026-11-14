import { describe, expect, it, vi } from "vitest";
import { exportDesignJsonBlob, exportDesignPng } from "./export";
import type { LogoAsset } from "./state";
import { createDesignStore } from "./store";

const logo = (url: string): LogoAsset => ({ file: new File(["x"], "l.png"), kind: "png", url, width: 10, height: 10 });

describe("createDesignStore", () => {
  it("notifies only on real changes", () => {
    const store = createDesignStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.dispatch({ type: "setText", text: "ABC" });
    store.dispatch({ type: "setColor", role: "textColor", color: "zzz" });
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    store.dispatch({ type: "setText", text: "D" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("revokes replaced and destroyed logo URLs", () => {
    const revoke = vi.fn();
    const store = createDesignStore(undefined, revoke);
    store.dispatch({ type: "setLogo", logo: logo("blob:a") });
    store.dispatch({ type: "setLogo", logo: logo("blob:b") });
    expect(revoke).toHaveBeenCalledWith("blob:a");
    store.destroy();
    expect(revoke).toHaveBeenCalledWith("blob:b");
  });

  it("keeps both logo versions while toggling the clean-up, revokes both on replace", () => {
    const revoke = vi.fn();
    const store = createDesignStore(undefined, revoke);
    store.dispatch({ type: "setLogo", logo: { ...logo("blob:clean"), cleaned: true, alt: { url: "blob:orig", width: 10, height: 10 } } });
    store.dispatch({ type: "setLogoCleanup", on: false });
    store.dispatch({ type: "setLogoCleanup", on: true });
    expect(revoke).not.toHaveBeenCalled();
    store.dispatch({ type: "setLogo", logo: null });
    expect(revoke.mock.calls.flat().sort()).toEqual(["blob:clean", "blob:orig"]);
  });

  it("publishes texture versions", () => {
    const store = createDesignStore();
    const fn = vi.fn();
    store.subscribeTexture(fn);
    const canvas = document.createElement("canvas");
    store.publishTexture(canvas);
    store.publishTexture(canvas);
    expect(store.getTexture().version).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exports PNG via the registered renderer", async () => {
    const store = createDesignStore();
    await expect(exportDesignPng(store)).rejects.toThrow("designer_not_ready");
    const blob = new Blob(["png"], { type: "image/png" });
    const canvas = { toBlob: (cb: (b: Blob | null) => void) => cb(blob) } as unknown as HTMLCanvasElement;
    const toCanvas = vi.fn(() => canvas);
    store.registerRenderer({ toCanvas });
    await expect(exportDesignPng(store, 3)).resolves.toBe(blob);
    expect(toCanvas).toHaveBeenCalledWith(3);
  });

  it("exports design JSON", async () => {
    const store = createDesignStore();
    store.dispatch({ type: "setText", text: " Hello " });
    const json = JSON.parse(await exportDesignJsonBlob(store).text());
    expect(json).toMatchObject({ version: 1, text: "Hello" });
  });
});
