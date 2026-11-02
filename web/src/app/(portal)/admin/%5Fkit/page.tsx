import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { KitDemo } from "@/features/portal-ui";

// Dev-only UI kit reference at /admin/_kit (folder "%5Fkit": a plain "_kit" folder is private in the App Router).
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function KitPage({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  const profile = await requireRole(ROLE_GROUPS.admin);
  return <KitDemo searchParams={await searchParams} role={profile.role} />;
}
