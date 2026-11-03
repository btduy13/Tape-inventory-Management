// /admin/don-hang/moi body: header + the order form. Default due date = today + 7 (Vietnam).
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { PageHeader } from "@/features/portal-ui/components/Section";
import { ordersCopy as c } from "../lib/copy";
import { listWorkshopUsers } from "../server/queries";
import { OrderForm } from "./OrderForm";

function vnDay(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

export async function NewOrderView() {
  const workshopUsers = await listWorkshopUsers(await createClient());
  return (
    <>
      <PageHeader
        title={c.newTitle}
        description={c.newIntro}
        breadcrumbs={[{ label: c.title, href: ROUTES.adminOrders }, { label: c.newTitle }]}
      />
      <OrderForm defaultDue={vnDay(7)} minDue={vnDay(0)} workshopUsers={workshopUsers} />
    </>
  );
}
