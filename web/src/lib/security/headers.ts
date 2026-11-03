// Static security headers applied to every response via next.config.ts.
// Content-Security-Policy is NOT here: it carries a per-request nonce (see csp.ts + src/proxy.ts).

export interface HeaderEntry {
  key: string;
  value: string;
}

function permissionsPolicy(camera: boolean): string {
  return `camera=${camera ? "(self)" : "()"}, microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`;
}

/** Path patterns (next.config `headers` syntax) whose pages may use the camera. */
export const CAMERA_PATHS = ["/giao/:token"] as const;

/** Overrides Permissions-Policy on CAMERA_PATHS (later next.config entries win). */
export function cameraPermissionsHeaders(): HeaderEntry[] {
  return [{ key: "Permissions-Policy", value: permissionsPolicy(true) }];
}

export function staticSecurityHeaders(): HeaderEntry[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: permissionsPolicy(false) },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];
}
