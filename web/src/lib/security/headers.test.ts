import { describe, expect, it } from "vitest";
import { CAMERA_PATHS, cameraPermissionsHeaders, staticSecurityHeaders } from "./headers";

const policy = (entries: { key: string; value: string }[]) => entries.find((h) => h.key === "Permissions-Policy")?.value;

describe("Permissions-Policy", () => {
  it("blocks the camera everywhere by default", () => {
    expect(policy(staticSecurityHeaders())).toContain("camera=()");
  });

  it("allows the camera (self only) just on the QR delivery page", () => {
    expect(CAMERA_PATHS).toEqual(["/giao/:token"]);
    const value = policy(cameraPermissionsHeaders());
    expect(value).toContain("camera=(self)");
    expect(value).toContain("microphone=()");
    expect(value).toContain("geolocation=()");
  });
});
