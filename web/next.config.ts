import type { NextConfig } from "next";
import { CAMERA_PATHS, cameraPermissionsHeaders, staticSecurityHeaders } from "./src/lib/security/headers";

// cacheComponents is intentionally OFF: the strict nonce-based CSP (see src/proxy.ts)
// requires every page to be rendered per request so Next.js can stamp the nonce.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // jsdom-based sanitizer must not be bundled (reads its own data files at runtime).
  serverExternalPackages: ["isomorphic-dompurify"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Logo upload goes through server code; 5 MB file + form overhead.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    // Non-CSP headers for every response (incl. static assets and API routes).
    // CSP itself is per-request (nonce) and set in src/proxy.ts.
    // Camera pages (QR delivery photo) come last: for the same key the later entry wins.
    return [
      { source: "/:path*", headers: staticSecurityHeaders() },
      ...CAMERA_PATHS.map((source) => ({ source, headers: cameraPermissionsHeaders() })),
    ];
  },
};

export default nextConfig;
