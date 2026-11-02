import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { LeadDetailView, ProductionSlot, loadLeadDetail } from "@/features/orders";
import { AssignPanel } from "@/features/assignment";
import { ProductionHandoffPanel } from "@/features/workshop";
import { QuotePanel } from "@/features/quotes";

export default async function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(ROLE_GROUPS.pricing);
  const detail = await loadLeadDetail((await params).id);
  if (!detail) notFound();
  const { lead } = detail;
  return (
    <LeadDetailView
      detail={detail}
      profile={profile}
      quotesSlot={<QuotePanel leadId={lead.id} profile={profile} />}
      aside={
        <>
          {/* Both panels render nothing for non-admins; the actions re-check the role. */}
          <AssignPanel profile={profile} leadId={lead.id} code={lead.code} currentAssigneeId={lead.assigned_to} />
          {profile.role === "admin" && (
            <ProductionSlot quotes={detail.quotes} status={lead.status} productionOrderId={lead.production_order_id}>
              <ProductionHandoffPanel profile={profile} lead={lead} />
            </ProductionSlot>
          )}
        </>
      }
    />
  );
}
