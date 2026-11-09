// Shared DB contract. MUST match supabase/migrations/*.sql.
// When migrations change, update this file AND regenerate the raw schema with
// `npm run db:types > src/lib/database.generated.ts` (local Docker Supabase).
// The hand-written types below are narrower (DesignJson, non-null generated columns,
// nullable RPC args); the drift check at the bottom fails typecheck if a table or
// column is added/removed in SQL without updating this file.

export type AppRole = "admin" | "manager" | "staff" | "ctv" | "workshop";

export type LeadStatus =
  | "new" | "assigned" | "consulting" | "quoted" | "accepted"
  | "production" | "shipping" | "done" | "cancelled";

export const LEAD_STATUSES: readonly LeadStatus[] = [
  "new", "assigned", "consulting", "quoted", "accepted",
  "production", "shipping", "done", "cancelled",
] as const;

export type QuoteStatus =
  | "draft" | "sent" | "accepted" | "changes_requested" | "expired" | "cancelled";

export const ROLES: readonly AppRole[] = ["admin", "manager", "staff", "ctv", "workshop"] as const;

/** Production (workshop) steps. `huy` (cancelled) is admin only. Since 0024 jobs use only
 *  cho_san_xuat -> dang_san_xuat -> san_sang_giao -> da_giao; dang_in / dang_cat_cuon / dong_goi
 *  remain in the enum as history in production_step_log. */
export type ProductionStep =
  | "cho_san_xuat" | "dang_san_xuat" | "dang_in" | "dang_cat_cuon" | "dong_goi" | "san_sang_giao" | "da_giao" | "huy";

export const PRODUCTION_STEPS: readonly ProductionStep[] = [
  "cho_san_xuat", "dang_san_xuat", "dang_in", "dang_cat_cuon", "dong_goi", "san_sang_giao", "da_giao", "huy",
] as const;

/** Postgres numeric comes back from PostgREST as number (or string for huge values). */
type Numeric = number;
type Timestamp = string; // ISO 8601
type Uuid = string;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------
export type Profile = {
  id: Uuid; email: string | null; full_name: string; phone: string | null;
  role: AppRole; is_active: boolean; created_at: Timestamp; updated_at: Timestamp;
  /** 0030: visible tabs (null = role default) and permission codes; admin-only to change. */
  nav_tabs: string[] | null; permissions: string[];
};

export type TapePreset = {
  id: Uuid; label: string; width_mm: Numeric; length_m: Numeric; thickness_mic: Numeric;
  sort_order: number; is_active: boolean; created_at: Timestamp; updated_at: Timestamp;
};

/** Tape widths offered in the designer (0022). Customer types the length within tape_spec_settings. */
export type TapeWidth = {
  id: Uuid; width_mm: number; is_active: boolean; sort_order: number;
  created_at: Timestamp; updated_at: Timestamp;
};

/** Single-row settings (0022): allowed roll length range + default thickness. */
export type TapeSpecSettings = {
  id: boolean; min_length_m: Numeric; max_length_m: Numeric; thickness_mic: Numeric; updated_at: Timestamp;
};

export type Lead = {
  id: Uuid; code: string; customer_name: string; phone: string; email: string | null;
  company: string | null; quantity: number; customer_note: string | null;
  status: LeadStatus; assigned_to: Uuid | null; assigned_at: Timestamp | null;
  production_order_id: string | null; source_ip_hash: string | null; user_agent: string | null;
  customer_id: Uuid | null;
  created_at: Timestamp; updated_at: Timestamp;
};

/** Shape of designs.design_json (owned by features/designer; version bump on breaking change). */
export type DesignJson = {
  version: 1;
  presetId: Uuid | null;
  backgroundColor: string;        // hex #rrggbb
  textColor: string;              // hex
  accentColor?: string | null;    // legacy (old designs): logo single-ink colour; no longer written
  text: string;
  fontFamily?: string;
  fontSizePx?: number;
  logo?: {
    path: string | null; scale: number; offsetX: number; offsetY: number;
    colorMode?: "original" | "tint";  // legacy (old designs); logos now always print in original colours
  } | null;
  repeatGapPx?: number;
  widthMm?: number;               // chosen tape width (mm), from tape_widths (0022)
  lengthM?: number;               // customer roll length (m), within tape_spec_settings
  textOffsetX?: number;           // text position, fraction of tape width (canvas drag)
  textOffsetY?: number;
  inkColors?: string[];           // printed inks (hex), tape film colour excluded (designer logo-colors)
  inkCount?: number;              // distinct print inks; > 3 needs a consultant
  inkOverLimit?: boolean;         // true: logo or design exceeds the 3-ink limit
};

export type Design = {
  id: Uuid; lead_id: Uuid; preset_id: Uuid | null;
  width_mm: Numeric; length_m: Numeric; thickness_mic: Numeric;
  colors: string[]; print_text: string | null; design_json: DesignJson;
  logo_path: string | null; preview_path: string | null; created_at: Timestamp;
};

export type LeadStatusLog = {
  id: number; lead_id: Uuid; from_status: LeadStatus | null; to_status: LeadStatus;
  changed_by: Uuid | null; note: string | null; created_at: Timestamp;
};

export type LeadAssignment = {
  id: number; lead_id: Uuid; assigned_to: Uuid | null; assigned_by: Uuid | null;
  created_at: Timestamp;
};

export type LeadNote = {
  id: number; lead_id: Uuid; author_id: Uuid | null; body: string; created_at: Timestamp;
};

export type Quote = {
  id: Uuid; lead_id: Uuid; version: number; status: QuoteStatus; currency: string;
  subtotal: Numeric; vat_percent: Numeric; vat_amount: Numeric; total: Numeric;
  valid_until: string | null; notes: string | null; pdf_path: string | null;
  created_by: Uuid | null; sent_at: Timestamp | null; responded_at: Timestamp | null;
  customer_response_note: string | null; created_at: Timestamp; updated_at: Timestamp;
};

export type QuoteLine = {
  id: Uuid; quote_id: Uuid; sort_order: number; description: string; unit: string;
  quantity: Numeric; unit_price: Numeric; line_total: Numeric;
};

export type QuoteToken = {
  id: Uuid; quote_id: Uuid; token_hash: string; expires_at: Timestamp;
  revoked_at: Timestamp | null; last_used_at: Timestamp | null; created_at: Timestamp;
};

export type RateLimit = { key: string; window_start: Timestamp; hits: number };

/** Workshop job (no customer / price data). order_id null = assigned, not converted yet.
 *  lead_id null = job of an order created in the desktop app / web admin (0024). */
export type ProductionJob = {
  id: Uuid; lead_id: Uuid | null; order_id: string | null; order_table: string; workshop_user_id: Uuid | null;
  step: ProductionStep; due_date: string | null; production_note: string | null;
  assigned_at: Timestamp | null; converted_by: Uuid | null; converted_at: Timestamp | null;
  created_at: Timestamp; updated_at: Timestamp;
};

export type ProductionStepLog = {
  id: number; job_id: Uuid; from_step: ProductionStep | null; to_step: ProductionStep;
  changed_by: Uuid | null; changed_by_name: string | null; note: string | null; created_at: Timestamp;
};

/** Row of rpc('workshop_jobs'): production specs only (fixed column list in SQL). Lead-less jobs
 *  (0024) have lead_id / lead_code null and colours as names from the order ("Đỏ"), not hex. */
export type WorkshopJobRow = {
  job_id: Uuid; lead_id: Uuid | null; lead_code: string | null; order_id: string | null; step: ProductionStep;
  due_date: string | null; production_note: string | null;
  workshop_user_id: Uuid | null; workshop_user_name: string | null;
  quantity: number; width_mm: Numeric | null; length_m: Numeric | null; thickness_mic: Numeric | null;
  colors: string[] | null; print_text: string | null; design_json: Partial<DesignJson> | null;
  preview_path: string | null; logo_path: string | null; desktop_delivered: boolean;
  converted_at: Timestamp | null; updated_at: Timestamp;
  order_name: string | null; order_table: string;
};

/** Row of rpc('create_delivery_note'): the raw token exists only in this response. */
export type DeliveryNoteCreated = {
  note_id: Uuid; token: string; job_id: Uuid; order_id: string | null; order_name: string | null;
  quantity: number; width_mm: Numeric | null; length_m: Numeric | null; thickness_mic: Numeric | null;
  colors: string[] | null; print_text: string | null; due_date: string | null;
  recipient_name: string | null; recipient_phone: string | null; recipient_address: string | null;
  created_at: Timestamp;
};

// ---------------------------------------------------------------------------
// supabase-js Database generic
// ---------------------------------------------------------------------------
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: [];
};

type Opt<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Note: row shapes are `type` aliases (not interfaces) so they satisfy supabase-js'
// Record<string, unknown> constraints.
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Opt<Profile, "email" | "full_name" | "phone" | "role" | "is_active" | "created_at" | "updated_at" | "nav_tabs" | "permissions">>;
      tape_presets: Table<TapePreset, Opt<TapePreset, "id" | "sort_order" | "is_active" | "created_at" | "updated_at">>;
      tape_widths: Table<TapeWidth, Opt<TapeWidth, "id" | "sort_order" | "is_active" | "created_at" | "updated_at">>;
      tape_spec_settings: Table<TapeSpecSettings, Opt<TapeSpecSettings, "id" | "thickness_mic" | "updated_at">>;
      leads: Table<Lead, Opt<Lead, "id" | "code" | "email" | "company" | "customer_note" | "status" | "assigned_to" | "assigned_at" | "production_order_id" | "source_ip_hash" | "user_agent" | "customer_id" | "created_at" | "updated_at">>;
      designs: Table<Design, Opt<Design, "id" | "preset_id" | "colors" | "print_text" | "design_json" | "logo_path" | "preview_path" | "created_at">>;
      lead_status_log: Table<LeadStatusLog, Opt<Omit<LeadStatusLog, "id">, "from_status" | "changed_by" | "note" | "created_at">>;
      lead_assignments: Table<LeadAssignment, Opt<Omit<LeadAssignment, "id">, "assigned_to" | "assigned_by" | "created_at">>;
      lead_notes: Table<LeadNote, Opt<Omit<LeadNote, "id">, "author_id" | "created_at">>;
      quotes: Table<Quote, Opt<Quote, "id" | "version" | "status" | "currency" | "subtotal" | "vat_percent" | "vat_amount" | "total" | "valid_until" | "notes" | "pdf_path" | "created_by" | "sent_at" | "responded_at" | "customer_response_note" | "created_at" | "updated_at">>;
      quote_lines: Table<QuoteLine, Opt<Omit<QuoteLine, "line_total">, "id" | "sort_order" | "unit">>;
      quote_tokens: Table<QuoteToken, Opt<QuoteToken, "id" | "revoked_at" | "last_used_at" | "created_at">>;
      rate_limits: Table<RateLimit, Opt<RateLimit, "hits">>;
      production_jobs: Table<ProductionJob, Opt<ProductionJob, "id" | "order_id" | "workshop_user_id" | "step" | "due_date" | "production_note" | "assigned_at" | "converted_by" | "converted_at" | "created_at" | "updated_at">>;
      production_step_log: Table<ProductionStepLog, Opt<Omit<ProductionStepLog, "id">, "from_step" | "changed_by" | "changed_by_name" | "note" | "created_at">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_manager_or_admin: { Args: Record<string, never>; Returns: boolean };
      is_internal: { Args: Record<string, never>; Returns: boolean };
      is_staff_of: { Args: { p_lead_id: Uuid }; Returns: boolean };
      can_access_lead: { Args: { p_lead_id: Uuid }; Returns: boolean };
      change_lead_status: { Args: { p_lead_id: Uuid; p_to: LeadStatus; p_note?: string | null }; Returns: Lead };
      assign_lead: { Args: { p_lead_id: Uuid; p_user_id: Uuid | null }; Returns: Lead };
      check_rate_limit: { Args: { p_key: string; p_window_seconds: number; p_max_hits: number }; Returns: boolean };
      convert_lead_to_production: {
        Args: { p_lead_id: Uuid; p_due_date: string; p_note?: string | null; p_workshop_user_id?: Uuid | null };
        Returns: string;
      };
      is_workshop: { Args: Record<string, never>; Returns: boolean };
      workshop_jobs: { Args: { p_job_id?: Uuid | null }; Returns: WorkshopJobRow[] };
      assign_production_job: { Args: { p_lead_id: Uuid; p_user_id: Uuid | null }; Returns: ProductionJob };
      advance_production_step: {
        Args: { p_job_id: Uuid; p_to: ProductionStep; p_note?: string | null };
        Returns: ProductionJob;
      };
      // Workshop v2 (0024): admin assigns any job; admin / assigned workshop user creates a delivery note.
      assign_workshop_job: { Args: { p_job_id: Uuid; p_user_id: Uuid | null }; Returns: ProductionJob };
      create_delivery_note: { Args: { p_job_id: Uuid }; Returns: DeliveryNoteCreated[] };
      // Admin-only order RPCs (0024). Shapes live in features/admin-orders/lib/types.ts.
      admin_orders_list: { Args: { p_filter?: Record<string, unknown> }; Returns: Record<string, unknown>[] };
      admin_order_get: { Args: { p_id: string }; Returns: Record<string, unknown> };
      admin_order_create: { Args: { p_payload: Record<string, unknown> }; Returns: { order_id: string; job_id: Uuid | null }[] };
      // Admin-only customer RPCs (0028). Shapes live in features/customers/lib/types.ts.
      admin_customers_list: { Args: { p_q?: string; p_limit?: number; p_offset?: number }; Returns: Record<string, unknown>[] };
      admin_customer_get: { Args: { p_id: Uuid }; Returns: Record<string, unknown> };
      admin_customer_create: { Args: { p_payload: Record<string, unknown> }; Returns: Uuid };
      admin_customer_update: { Args: { p_id: Uuid; p_payload: Record<string, unknown> }; Returns: Record<string, unknown> };
      admin_customer_merge: { Args: { p_target: Uuid; p_sources: Uuid[] }; Returns: number };
      admin_customer_review_list: { Args: { p_limit?: number; p_offset?: number }; Returns: Record<string, unknown>[] };
      admin_customer_review_resolve: { Args: { p_source_table: string; p_source_id: string; p_customer_id?: Uuid }; Returns: undefined };
      // Admin overview numbers (0029). Shape: features/admin/server/dashboard.ts.
      admin_dashboard: { Args: Record<string, never>; Returns: Record<string, unknown> };
    };
    Enums: { app_role: AppRole; lead_status: LeadStatus; quote_status: QuoteStatus; production_step: ProductionStep };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

/** Storage buckets (all private). Object path: `<lead_id>/<file>`. */
export const STORAGE_BUCKETS = {
  logos: "logos", previews: "previews", quotes: "quotes",
  /** Delivery confirmation photos: `<note_id>/<name>.jpg`, service_role writes, admin reads (0024). */
  deliveryPhotos: "delivery-photos",
} as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// ---------------------------------------------------------------------------
// Schema drift check against the generated types (compile-time only)
// ---------------------------------------------------------------------------
export type { Database as GeneratedDatabase } from "./database.generated";
import type { Database as GeneratedDatabase } from "./database.generated";

type GenTables = GeneratedDatabase["public"]["Tables"];
type AppTables = Database["public"]["Tables"];
type SameKeys<A, B> = [Exclude<keyof A, keyof B> | Exclude<keyof B, keyof A>] extends [never] ? true : false;
type AssertTrue<T extends true> = T;
type ColumnDrift = {
  [K in keyof AppTables]: K extends keyof GenTables ? SameKeys<AppTables[K]["Row"], GenTables[K]["Row"]> : false;
}[keyof AppTables];
type AppFunctionsMissing = Exclude<keyof Database["public"]["Functions"], keyof GeneratedDatabase["public"]["Functions"]>;
/** Fails typecheck when types.ts and the migrations disagree on tables, columns or RPCs. */
export type SchemaDriftCheck = [
  AssertTrue<ColumnDrift extends true ? true : false>,
  AssertTrue<[AppFunctionsMissing] extends [never] ? true : false>,
];
