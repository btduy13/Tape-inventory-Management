import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { WorkshopDeliveryNoteView } from "@/features/workshop";

export const metadata: Metadata = { title: "Phiếu giao hàng", robots: { index: false } };

export default async function DeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ROLE_GROUPS.production);
  const id = (await params).id;
  if (!z.guid().safeParse(id).success) notFound();
  // CSP nonce for the print <style> (page size A5, print only the note).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const view = await WorkshopDeliveryNoteView({ jobId: id, nonce });
  if (!view) notFound();
  return view;
}
