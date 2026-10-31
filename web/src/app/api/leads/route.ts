// POST /api/leads: public quote request. Thin: logic lives in features/lead-intake.
import { createLeadSubmitDeps, handleLeadSubmit } from "@/features/lead-intake/server";

export async function POST(req: Request): Promise<Response> {
  return handleLeadSubmit(req, createLeadSubmitDeps());
}
