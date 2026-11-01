// Drops the one known third-party deprecation notice (r3f 9 still builds a THREE.Clock;
// three >= r183 warns on every Canvas mount). Everything else is forwarded unchanged.
import { getConsoleFunction, setConsoleFunction } from "three";

const SILENCED = ["Clock: This module has been deprecated"];
let installed = false;

export function isSilencedThreeMessage(message: unknown): boolean {
  return typeof message === "string" && SILENCED.some((s) => message.includes(s));
}

export function installThreeConsoleFilter(): void {
  if (installed) return;
  installed = true;
  const previous = getConsoleFunction();
  setConsoleFunction((type, message, ...params) => {
    if (type === "warn" && isSilencedThreeMessage(message)) return;
    if (previous) return previous(type, message, ...params);
    const out = type === "error" ? console.error : type === "warn" ? console.warn : console.log;
    // Keep three's stack-trace helper behaviour (see three/src/utils.js).
    const trace = params[0] as { isStackTrace?: boolean; getError?: (m: string) => unknown } | undefined;
    if (trace?.isStackTrace && trace.getError) out(trace.getError(message));
    else out(message, ...params);
  });
}
