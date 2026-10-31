import { handleAuthCallback } from "@/features/auth";

export async function GET(request: Request) {
  return handleAuthCallback(request);
}
