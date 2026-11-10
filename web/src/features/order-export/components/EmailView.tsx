// /admin/don-hang/xuat/email?type=&id=: the app's order notification email for one order.
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { ErrorState, PageHeader, Section } from "@/features/portal-ui";
import { orderHref } from "@/features/admin-orders/lib/paths";
import type { OrderType } from "@/features/admin-orders/lib/types";
import { DEFAULT_EMAIL_TO, orderEmailDraft } from "../lib/email-template";
import { loadEmailContext } from "../server/queries";
import { OrderEmailForm } from "./OrderEmailForm";

export async function EmailView({ type, id }: { type: OrderType; id: string }) {
  const ctx = await loadEmailContext(await createClient(), type, id);
  const header = (
    <PageHeader title="Gửi email thông báo đơn"
      breadcrumbs={[{ label: "Đơn hàng", href: ROUTES.adminOrders }, { label: id, href: orderHref(type, id) }, { label: "Email" }]} />
  );
  if (!ctx) return <>{header}<ErrorState body="Không tìm thấy dữ liệu đơn hàng" /></>;
  if (!ctx.attachments) return <>{header}<ErrorState body="Không tải được danh sách tệp đính kèm. Vui lòng tải lại trang." /></>;
  return (
    <>
      {header}
      <Section>
        <OrderEmailForm type={type} id={id} draft={orderEmailDraft(type, ctx.order)} defaultTo={DEFAULT_EMAIL_TO}
          attachments={ctx.attachments} suggestions={ctx.suggestions} />
      </Section>
    </>
  );
}
