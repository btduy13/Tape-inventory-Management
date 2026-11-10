import { notFound } from "next/navigation";
import { requireTab } from "@/lib/auth/require-role";
import { LeadDetailView, ProductionSlot, loadLeadDetail } from "@/features/orders";
import { AssignPanel } from "@/features/assignment";
import { ProductionHandoffPanel } from "@/features/workshop";
import { QuotePanel } from "@/features/quotes";

export default async function PortalLeadPage({ params }: { params: Promise<{ id: string }> }) {
  // Gate and lead read run together (one round trip less); a failed gate redirects before
  // anything renders, and the lead read itself is RLS-scoped.
  const [profile, detail] = await Promise.all([requireTab("leads"), params.then((p) => loadLeadDetail(p.id))]);
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
