import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { LeadDetailView, loadLeadDetail } from "@/features/orders";
import { AssignPanel } from "@/features/assignment";
import { ProductionPanel } from "@/features/admin";
import { QuotePanel } from "@/features/quotes";

const t = getDictionary();

export default async function PortalLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(ROLE_GROUPS.internal);
  const detail = await loadLeadDetail((await params).id);
  if (!detail) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href={ROUTES.portal} className="text-sm text-amber-800 hover:underline">{t.common.back}</Link>
      <LeadDetailView
        detail={detail}
        profile={profile}
        quotesSlot={<QuotePanel leadId={detail.lead.id} profile={profile} />}
        aside={
          <>
            <AssignPanel profile={profile} leadId={detail.lead.id} currentAssigneeId={detail.lead.assigned_to} />
            <ProductionPanel profile={profile} lead={detail.lead} />
          </>
        }
      />
    </div>
  );
}
