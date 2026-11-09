"use server";
// Order notification email (emailDialog.js of the app): send through the shared email sender
// (Resend, fake in dev), then da_gui_email + email_history via admin_order_mark_emailed (0031).
import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPerm, ForbiddenError } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { escapeMultiline, getEmailSender, normalizeRecipients } from "@/features/email";
import { orderIdSchema, orderTypeSchema } from "@/features/admin-orders/lib/schemas";
import { MAX_ATTACHMENT_BYTES, splitRecipients } from "../lib/email-template";
import { checkUserRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { loadAttachments, loadEmailContext, markEmailed } from "./queries";

export type EmailActionState = { status: "idle" | "error" | "success"; message?: string };

const schema = z.object({
  type: orderTypeSchema,
  id: orderIdSchema,
  to: z.string().max(2000),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  att: z.array(z.coerce.number().int().positive()).max(20),
});

const err = (message: string): EmailActionState => ({ status: "error", message });

export async function sendOrderEmailAction(_prev: EmailActionState, form: FormData): Promise<EmailActionState> {
  let userId: string;
  try {
    userId = (await assertPerm("orders.edit")).id;
  } catch (e) {
    if (e instanceof ForbiddenError) return err("Bạn không có quyền gửi email.");
    throw e;
  }
  const parsed = schema.safeParse({
    type: form.get("type"), id: form.get("id"), to: form.get("to") ?? "", subject: form.get("subject") ?? "",
    body: form.get("body") ?? "", att: form.getAll("att"),
  });
  if (!parsed.success) return err("Thiếu tiêu đề hoặc nội dung email.");
  const { type, id, subject, body, att } = parsed.data;
  const wanted = splitRecipients(parsed.data.to);
  const to = normalizeRecipients(wanted);
  if (to.length === 0 || to.length !== wanted.length) return err("Địa chỉ email người nhận không hợp lệ.");
  if (to.length > 20) return err("Tối đa 20 người nhận.");

  const db = await createClient();
  // The order must exist (and be readable) before anything is sent; sizes are checked before download.
  const ctx = await loadEmailContext(db, type, id);
  if (!ctx) return err("Không tìm thấy đơn hàng.");
  const wantedAtt = [...new Set(att)];
  const picked = ctx.attachments.filter((a) => wantedAtt.includes(a.id));
  if (picked.length !== wantedAtt.length) return err("Không tải được tệp đính kèm của đơn.");
  if (picked.reduce((sum, a) => sum + Number(a.file_size || 0), 0) > MAX_ATTACHMENT_BYTES) {
    return err("Tổng dung lượng tệp đính kèm vượt quá 25 MB.");
  }
  if (!(await checkUserRateLimit(userId, RATE_LIMITS.orderEmail))) return err("Đã gửi quá nhiều email. Thử lại sau.");
  const attachments = await loadAttachments(db, type, id, wantedAtt);
  if (!attachments) return err("Không tải được tệp đính kèm của đơn.");
  if (attachments.reduce((sum, a) => sum + a.content.byteLength, 0) > MAX_ATTACHMENT_BYTES) {
    return err("Tổng dung lượng tệp đính kèm vượt quá 25 MB.");
  }

  const result = await getEmailSender().send({
    to, subject, text: body, attachments,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#18181b">${escapeMultiline(body)}</div>`,
  });
  if (!result.ok) {
    return err(result.error === "email not configured" ? "Chưa cấu hình email" : `Gửi email thất bại: ${result.error}`);
  }
  const marked = await markEmailed(db, type, id, to);
  revalidatePath(ROUTES.adminOrders, "layout");
  return marked
    ? { status: "success", message: `Đã gửi email tới ${to.join(", ")}` }
    : { status: "success", message: "Đã gửi email nhưng chưa ghi được trạng thái \"Đã email\"." };
}
