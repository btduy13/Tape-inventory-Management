import type { Metadata } from "next";
import { DeliveryPage, deliveryCopy } from "@/features/delivery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: deliveryCopy.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function DeliveryTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <DeliveryPage token={token} />;
}
