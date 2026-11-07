import { describe, expect, it } from "vitest";
import { randomToken, sha256Hex } from "./hash";

describe("hash helpers", () => {
  it("sha256Hex matches known vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("randomToken is url-safe and long enough", () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(t).not.toBe(randomToken());
  });
});
