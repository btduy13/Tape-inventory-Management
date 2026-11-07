// /admin/don-hang/moi?type=&quote=1 body: header + the order form of that type. Default due date =
// today + 7 (Vietnam), like the hand-off form.
import { format } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/features/portal-ui/components/Section";
import { defaultDueDate, vnToday } from "@/features/workshop/lib/dates";
import { listWorkshopUsers } from "@/features/workshop/server/queries";
import { TYPE_LABEL, ordersCopy as c } from "../lib/copy";
import { newOrderHref, tabHref } from "../lib/paths";
import { ORDER_TYPES, type OrderType } from "../lib/types";
import { PillNav } from "./badges";
import { OrderForm } from "./OrderForm";

export async function NewOrderView({ type, quote }: { type: OrderType; quote: boolean }) {
  const workshopUsers = type === "bang_keo_in" && !quote ? await listWorkshopUsers(await createClient()) : [];
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
        initial={{ ngay_du_kien: defaultDueDate(), loai_truc: "cu", vat_percent: "" }}
        initialCustomer={null}
        minDue={vnToday()}
        workshopUsers={workshopUsers}
      />
    </>
  );
}
