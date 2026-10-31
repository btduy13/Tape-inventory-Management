// Loads the mockup PNG from the private `previews` bucket for inline embedding.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/types";

const MAX_INLINE_BYTES = 2 * 1024 * 1024;
// "<lead uuid>/<file>.png" only: no traversal, no other buckets.
const PREVIEW_PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}\.png$/i;

export async function loadPreviewImage(path: string): Promise<Uint8Array | null> {
  if (!PREVIEW_PATH.test(path) || path.includes("..")) return null;
  try {
    const { data, error } = await createAdminClient().storage.from(STORAGE_BUCKETS.previews).download(path);
    if (error || !data) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    return bytes.byteLength > 0 && bytes.byteLength <= MAX_INLINE_BYTES ? bytes : null;
  } catch {
    return null;
  }
}
