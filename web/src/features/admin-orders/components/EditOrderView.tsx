// /admin/don-hang/[id]/sua?type= body: the order form filled from admin_order_get. Orders from a
// multi-size quote (quote_items) only edit name, customer and due date (admin_order_update rule).
import { notFound } from "next/navigation";
import { format } from "@/i18n";
import { hasPerm } from "@/lib/auth/permissions";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/features/portal-ui/components/Section";
import { ErrorState } from "@/features/portal-ui/components/States";
import { ordersCopy as c } from "../lib/copy";
import { orderHref, tabHref } from "../lib/paths";
import { vatPercentFromAmount } from "../lib/order-math";
import { ORDER_SCHEMAS } from "../lib/schemas";
import { hasQuoteItems, type OrderType } from "../lib/types";
import { getOrder } from "../server/queries";
import { OrderForm } from "./OrderForm";

export async function EditOrderView({ id, type }: { id: string; type: OrderType }) {
  const db = await createClient();
  const [load, profile] = await Promise.all([getOrder(db, id, type), getCurrentProfile()]);
  if (!load.ok && load.reason === "not_found") notFound();
  if (!load.ok) return <ErrorState body={c.loadError} />;
  const { order } = load.detail;
  const initial: Record<string, string> = {};
  for (const key of Object.keys(ORDER_SCHEMAS[type].shape)) {
    const v = order[key];
    if (typeof v === "string" || typeof v === "number") initial[key] = String(v);
  }
  // Old app rows store a VAT amount with percent 0 / null: derive it like the app's edit dialog,
  // so saving the form keeps the VAT. A real 0 % stays empty, like a new form.
  for (const [pct, vat, base] of [["vat_percent", "vat", "thanh_tien_ban"], ["truc_vat_percent", "truc_vat", "truc_thanh_tien_ban"]] as const) {
    if (!(pct in ORDER_SCHEMAS[type].shape)) continue;
    const derived = vatPercentFromAmount(order[vat] as number | string | null, order[base] as number | string | null, order[pct] as number | string | null);
    initial[pct] = derived > 0 ? String(derived) : "";
  }
  const customer = load.detail.customer ?? null;
  const title = format(c.editTitle, { id: order.id });
  return (
    <>
      <PageHeader
        title={title}
        description={c.editIntro}
        breadcrumbs={[
          { label: c.title, href: tabHref(order.is_quote === true ? "quote" : type) },
          { label: order.id, href: orderHref(type, order.id) },
          { label: c.actEdit },
        ]}
      />
      <OrderForm
        type={type}
        mode="edit"
        orderId={order.id}
        isQuote={order.is_quote === true}
        frozen={hasQuoteItems(order)}
        initial={initial}
        money={hasPerm(profile, "orders.money")}
        initialCustomer={customer ? { id: customer.id, name: customer.name } : null}
        workshopUsers={[]}
      />
    </>
  );
}
