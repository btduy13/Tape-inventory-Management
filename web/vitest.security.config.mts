// Security regression suite (integration). Runs against the LOCAL stack only:
//   web  : SECURITY_BASE_URL (default http://localhost:3000, a production build via `next start`)
//   API  : NEXT_PUBLIC_SUPABASE_URL from .env.local (local Docker Supabase)
// Run: npm run test:security. Not part of the default unit run (vitest.config.mts only
// includes src/**).
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";

const env = loadEnv("test", fileURLToPath(new URL(".", import.meta.url)), "");

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/security/**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e", "src"],
    globalSetup: ["tests/security/global-setup.ts"],
    // In-process handler calls (helpers/intake.ts submitInProcess) model a deployment behind a
    // trusted edge that sets X-Real-IP. The live server under test (`next start`, no proxy)
    // does not get this setting and must ignore every forwarding header.
    env: { ...env, TRUSTED_PROXY: "x-real-ip" },
    // Files share one live server whose per-client rate-limit buckets cannot be split by a
    // spoofed client IP any more (INTAKE-RL-1): run files one after another so a burst in one
    // file (e.g. concurrent quote responses) cannot exhaust another file's bucket.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    restoreMocks: true,
  },
});
