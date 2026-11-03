import { handleConfirmRequest } from "@/features/delivery";
import { withCsp } from "@/lib/security/csp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Not covered by src/proxy.ts (body would be buffered before the route's cap): CSP set here.
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return withCsp(await handleConfirmRequest(req, token));
}
