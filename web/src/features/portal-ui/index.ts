// Public API of features/portal-ui (shell + UI kit + list helpers). See DESIGN.md.
// Components without "use client" are universal: usable from server and client components.
export { AppShell } from "./components/AppShell";
export { PageHeader, Breadcrumbs, Section, StatCard, StatGrid, type Crumb } from "./components/Section";
export { DataTable, type Column, type DataTableList } from "./components/DataTable";
export { FilterBar, type FilterControl, type FilterOption } from "./components/FilterBar";
export { Pagination } from "./components/Pagination";
export { StatusBadge, StepBadge, ToneBadge } from "./components/StatusBadge";
export { WorkflowStepper, ProductionStepper } from "./components/WorkflowStepper";
export { ConfirmDialog, ConfirmSubmit } from "./components/ConfirmDialog";
export { Toast, type ToastMessage } from "./components/Toast";
export { EmptyState, ErrorState, LoadingState, NotFoundState, InlineStatus, ActionStatus, type InlineTone } from "./components/States";
export { Field, TextField, SelectField, TextareaField, CheckboxField } from "./components/Field";
export { Icon, type IconName } from "./components/Icon";
export { buttonClass, inputClass, textareaClass, checkboxClass, surfaceClass, linkClass, type ButtonVariant } from "./components/styles";

export {
  defineListSpec, parseListParams, serializeListParams, listHref, patchListState, toggleSort,
  clearFilters, hasActiveFilters, defaultListState, sanitizeSearch, pageCount, clampPage, pageSlice,
  type ListSpec, type ListState, type FilterDef, type SortDir, type RawParams,
} from "./lib/list-params";
export { applyListQuery, type ListQuery } from "./lib/apply-query";
export { applyListInMemory, foldText } from "./lib/apply-memory";
export { LEAD_PIPELINE, PRODUCTION_FLOW, nextActionFor, pipelineIndex, type Actor, type Phase } from "./lib/workflow";
export { LEAD_TONE, STEP_TONE, TONE_CLASS, type Tone } from "./lib/status-tones";
export { navFor, homeFor } from "./lib/nav";
