import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { WorkshopJobView } from "@/features/workshop";

export default async function WorkshopJobPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(ROLE_GROUPS.production);
  const id = (await params).id;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const view = await WorkshopJobView({ profile, jobId: id });
  if (!view) notFound();
  return view;
}
