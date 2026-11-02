// Dev-only living reference of the portal kit (/admin/_kit). Uses fake rows from sample.ts.
import { getDictionary } from "@/i18n";
import { LEAD_STATUSES, PRODUCTION_STEPS, type AppRole } from "@/lib/types";
import { DataTable, type Column } from "../components/DataTable";
import { CheckboxField, SelectField, TextField, TextareaField } from "../components/Field";
import { FilterBar } from "../components/FilterBar";
import { PageHeader, Section, StatCard, StatGrid } from "../components/Section";
import { EmptyState, ErrorState, InlineStatus, LoadingState } from "../components/States";
import { StatusBadge, StepBadge } from "../components/StatusBadge";
import { ProductionStepper, WorkflowStepper } from "../components/WorkflowStepper";
import { buttonClass } from "../components/styles";
import { applyListInMemory } from "../lib/apply-memory";
import { parseListParams, type RawParams } from "../lib/list-params";
import { LEAD_TONE } from "../lib/status-tones";
import { DEMO_LEADS, DEMO_SPEC, type DemoLead } from "./sample";
import { KitInteractive } from "./KitInteractive";

const t = getDictionary();
const BASE = "/admin/_kit";

const columns: Column<DemoLead>[] = [
  { key: "code", header: "Mã", sortKey: "code", cell: (r) => r.code, mobile: "title" },
  { key: "customer", header: "Khách hàng", sortKey: "customer", mobile: "title", cell: (r) => (
    <span className="flex flex-col"><span className="font-medium text-pt-text">{r.customer_name}</span><span className="text-xs text-pt-muted">{r.company ?? r.phone}</span></span>
  ) },
  { key: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} />, mobile: "badge" },
  { key: "qty", header: "Số cuộn", sortKey: "qty", align: "end", cell: (r) => r.quantity.toLocaleString("vi-VN") },
  { key: "owner", header: "Phụ trách", cell: (r) => r.assignee ?? <span className="text-pt-muted">{t.assignment.unassigned}</span>, className: "hidden lg:table-cell" },
  { key: "updated", header: "Cập nhật", sortKey: "updated", cell: (r) => new Date(r.updated_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) },
];

export function KitDemo({ searchParams, role }: { searchParams: RawParams; role: AppRole }) {
  const state = parseListParams(DEMO_SPEC, searchParams);
  const { rows, total } = applyListInMemory(DEMO_LEADS, DEMO_SPEC, state);
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, DEMO_LEADS.filter((l) => l.status === s).length]));

  return (
    <>
      <PageHeader
        title={t.portalUi.kitTitle}
        description="Mẫu dùng chung cho mọi trang quản trị, nhân viên, CTV và xưởng. Dữ liệu dưới đây là dữ liệu giả."
        breadcrumbs={[{ label: t.portalUi.navOverview, href: "/admin" }, { label: t.portalUi.kitTitle }]}
        actions={<a href="#bang" className={buttonClass("primary")}>Xem bảng mẫu</a>}
      />

      <StatGrid>
        {(["new", "consulting", "quoted", "production", "done"] as const).map((s) => (
          <StatCard key={s} label={t.leadStatus[s]} value={counts[s] ?? 0} tone={LEAD_TONE[s]} href={`${BASE}?status=${s}#bang`} />
        ))}
      </StatGrid>

      <Section title={t.portalUi.workflow} description="Thanh băng keo: đoạn đã qua màu xanh, đoạn hiện tại màu vàng.">
        <WorkflowStepper status="consulting" role={role} />
        <WorkflowStepper status="quoted" role={role} />
        <WorkflowStepper status="cancelled" role={role} />
      </Section>

      <Section title={t.portalUi.productionFlow}>
        <ProductionStepper step="dang_cat_cuon" />
      </Section>

      <Section title="Nhãn trạng thái">
        <div className="flex flex-wrap gap-2">{LEAD_STATUSES.map((s) => <StatusBadge key={s} status={s} />)}</div>
        <div className="flex flex-wrap gap-2">{PRODUCTION_STEPS.map((s) => <StepBadge key={s} step={s} />)}</div>
      </Section>

      <Section id="bang" title="Danh sách" description="Sắp xếp bằng tiêu đề cột, lọc theo trạng thái, người phụ trách và ngày cập nhật." variant="plain">
        <FilterBar
          basePath={BASE}
          spec={DEMO_SPEC}
          state={state}
          dateRange
          dateLabel="Ngày cập nhật"
          controls={[
            { kind: "select", name: "owner", label: "Người phụ trách", options: [{ value: "Nhân viên A", label: "Nhân viên A" }, { value: "CTV Bình", label: "CTV Bình" }] },
            { kind: "chips", name: "status", label: "Trạng thái", options: LEAD_STATUSES.map((s) => ({ value: s, label: t.leadStatus[s] })) },
          ]}
        />
        <DataTable
          caption="Khách hàng mẫu"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={() => `${BASE}#bang`}
          list={{ basePath: BASE, spec: DEMO_SPEC, state, total }}
          filtered={total === 0}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Biểu mẫu">
          <TextField label="Tên khách hàng" name="name" required placeholder="Nguyễn Văn An" />
          <SelectField label="Giao cho" name="owner" placeholder="Chọn người phụ trách" options={[{ value: "a", label: "Nhân viên A" }]} />
          <TextField label="Số điện thoại" name="phone" error="Số điện thoại phải có 10 chữ số." defaultValue="0909" />
          <TextareaField label="Ghi chú" name="note" hint="Chỉ nội bộ thấy ghi chú này." />
          <CheckboxField label="Đang hoạt động" name="active" defaultChecked />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass("primary")}>Lưu</button>
            <button type="button" className={buttonClass("secondary")}>Hủy</button>
            <button type="button" className={buttonClass("ghost")}>Bỏ qua</button>
            <button type="button" disabled className={buttonClass("primary")}>Đang lưu</button>
          </div>
        </Section>
        <Section title="Phản hồi">
          <InlineStatus tone="success">Đã cập nhật trạng thái.</InlineStatus>
          <InlineStatus tone="error">Không được phép chuyển sang trạng thái này.</InlineStatus>
          <InlineStatus tone="info">Chỉ quản trị và quản lý được đặt giá.</InlineStatus>
          <KitInteractive />
          <EmptyState title="Chưa có khách hàng nào" body="Khách gửi yêu cầu từ trang thiết kế sẽ hiện ở đây." />
          <ErrorState body="Kiểm tra kết nối mạng rồi tải lại trang." />
          <LoadingState rows={2} />
        </Section>
      </div>
    </>
  );
}
