// /admin/don-hang/moi?type=&quote=1 body: header + the order form of that type. Default due date =
// tomorrow (Vietnam), like the app.
import { format } from "@/i18n";
import { hasPerm } from "@/lib/auth/permissions";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/features/portal-ui/components/Section";
import { addDays, vnToday } from "@/features/workshop/lib/dates";
import { listWorkshopUsers } from "@/features/workshop/server/queries";
import { TYPE_LABEL, ordersCopy as c } from "../lib/copy";
import { newOrderHref, tabHref } from "../lib/paths";
import { ORDER_TYPES, type OrderType } from "../lib/types";
import { PillNav } from "./badges";
import { OrderForm } from "./OrderForm";

export async function NewOrderView({ type, quote }: { type: OrderType; quote: boolean }) {
  const db = await createClient();
  const [workshopUsers, profile] = await Promise.all([
    type === "bang_keo_in" && !quote ? listWorkshopUsers(db) : [],
    getCurrentProfile(),
  ]);
  const title = format(quote ? c.newQuoteTitle : c.newTitle, { type: TYPE_LABEL[type].toLowerCase() });
  return (
    <>
      <PageHeader
        title={title}
        description={c.newIntro}
        breadcrumbs={[{ label: c.title, href: tabHref(quote ? "quote" : type) }, { label: title }]}
      />
      <PillNav label={c.tabsLabel} current={type} items={ORDER_TYPES.map((k) => [k, TYPE_LABEL[k], newOrderHref(k, quote)] as const)} />
      <OrderForm
        key={`${type}-${quote}`}
        type={type}
        mode="create"
        isQuote={quote}
        initial={{ ngay_du_kien: addDays(vnToday(), 1), loai_truc: "cu", vat_percent: "" }}
        initialCustomer={null}
        money={hasPerm(profile, "orders.money")}
        workshopUsers={workshopUsers}
      />
    </>
  );
}
