// POST /api/leads: public quote request. Thin: logic lives in features/lead-intake.
// Not covered by src/proxy.ts (body would be buffered before the route's cap), so the CSP
// header is set here.
import { createLeadSubmitDeps, handleLeadSubmit } from "@/features/lead-intake/server";
import { withCsp } from "@/lib/security/csp";

export async function POST(req: Request): Promise<Response> {
  return withCsp(await handleLeadSubmit(req, createLeadSubmitDeps()));
}

export function GET(): Response {
  return withCsp(new Response(null, { status: 405, headers: { allow: "POST" } }));
}
