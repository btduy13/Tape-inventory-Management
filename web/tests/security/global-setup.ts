// Clears the cross-worker session cache (helpers/sessions.ts) once per run, so tokens and user ids
// cached before a `npm run db:reset` are never reused against the re-seeded database.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export default function setup(): void {
  fs.rmSync(path.join(os.tmpdir(), "tape-security-tests"), { recursive: true, force: true });
}
