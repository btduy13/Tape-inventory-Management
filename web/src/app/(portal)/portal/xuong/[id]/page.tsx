import { notFound } from "next/navigation";
import { z } from "zod";
import { requireTab } from "@/lib/auth/require-role";
import { WorkshopJobView } from "@/features/workshop";

export default async function WorkshopJobPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireTab("workshop");
  const id = (await params).id;
  if (!z.guid().safeParse(id).success) notFound();
  const view = await WorkshopJobView({ profile, jobId: id });
  if (!view) notFound();
  return view;
}
