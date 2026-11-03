import { describe, expect, it } from "vitest";
import { randomToken } from "@/lib/security/hash";
import { deliveryCopy, deliveryErrorMessage, fmtDeliveredAt } from "./copy";
import { fitSize } from "./client-image";
import { hashDeliveryToken, isDeliveryToken, noteAccess } from "./token";

describe("delivery token", () => {
  it("accepts exactly the 43-char base64url tokens create_delivery_note issues", () => {
    expect(isDeliveryToken(randomToken(32))).toBe(true);
    expect(isDeliveryToken("a".repeat(42))).toBe(false);
    expect(isDeliveryToken("a".repeat(44))).toBe(false);
    expect(isDeliveryToken(`${"a".repeat(42)}=`)).toBe(false);
    expect(isDeliveryToken(`${"a".repeat(42)}/`)).toBe(false);
  });

  it("hashes as lowercase sha256 hex of the UTF-8 token", async () => {
    expect(await hashDeliveryToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("maps note state to page access", () => {
    expect(noteAccess({ status: "open", jobReady: true })).toBe("capture");
    expect(noteAccess({ status: "open", jobReady: false })).toBe("not_ready");
    expect(noteAccess({ status: "confirmed", jobReady: false })).toBe("confirmed");
    expect(noteAccess({ status: "revoked", jobReady: true })).toBe("replaced");
  });
});

describe("delivery copy", () => {
  it("falls back to a generic message for unknown codes", () => {
    expect(deliveryErrorMessage("blank")).toBe(deliveryCopy.errors.blank);
    expect(deliveryErrorMessage("whatever")).toBe(deliveryCopy.errors.server_error);
    expect(deliveryErrorMessage(undefined)).toBe(deliveryCopy.errors.server_error);
    expect(deliveryErrorMessage("toString")).toBe(deliveryCopy.errors.server_error);
  });

  it("formats the delivery time in Vietnam time", () => {
    expect(fmtDeliveredAt("2026-11-03T03:05:00Z")).toContain("10:05");
  });
});

describe("fitSize", () => {
  it("keeps small images and scales the long edge down", () => {
    expect(fitSize(1280, 960)).toEqual({ width: 1280, height: 960 });
    expect(fitSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitSize(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });
});
