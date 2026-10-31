// Shared DB contract. MUST match supabase/migrations/*.sql.
// When migrations change, update this file (or regenerate with
// `npx supabase --workdir .. gen types typescript --local` once Docker is available).

export type AppRole = "admin" | "manager" | "staff" | "ctv";

export type LeadStatus =
  | "new" | "assigned" | "consulting" | "quoted" | "accepted"
  | "production" | "shipping" | "done" | "cancelled";

export const LEAD_STATUSES: readonly LeadStatus[] = [
  "new", "assigned", "consulting", "quoted", "accepted",
  "production", "shipping", "done", "cancelled",
] as const;

export type QuoteStatus =
  | "draft" | "sent" | "accepted" | "changes_requested" | "expired" | "cancelled";

export const ROLES: readonly AppRole[] = ["admin", "manager", "staff", "ctv"] as const;

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
};

export type TapePreset = {
  id: Uuid; label: string; width_mm: Numeric; length_m: Numeric; thickness_mic: Numeric;
  sort_order: number; is_active: boolean; created_at: Timestamp; updated_at: Timestamp;
};

export type Lead = {
  id: Uuid; code: string; customer_name: string; phone: string; email: string | null;
  company: string | null; quantity: number; customer_note: string | null;
  status: LeadStatus; assigned_to: Uuid | null; assigned_at: Timestamp | null;
  production_order_id: string | null; source_ip_hash: string | null; user_agent: string | null;
  created_at: Timestamp; updated_at: Timestamp;
};

/** Shape of designs.design_json (owned by features/designer; version bump on breaking change). */
export type DesignJson = {
  version: 1;
  presetId: Uuid | null;
  backgroundColor: string;        // hex #rrggbb
  textColor: string;              // hex
  accentColor?: string | null;    // hex, optional 3rd color (logo tint / border)
  text: string;
  fontFamily?: string;
  fontSizePx?: number;
  logo?: { path: string | null; scale: number; offsetX: number; offsetY: number } | null;
  repeatGapPx?: number;
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
      profiles: Table<Profile, Opt<Profile, "email" | "full_name" | "phone" | "role" | "is_active" | "created_at" | "updated_at">>;
      tape_presets: Table<TapePreset, Opt<TapePreset, "id" | "sort_order" | "is_active" | "created_at" | "updated_at">>;
      leads: Table<Lead, Opt<Lead, "id" | "code" | "email" | "company" | "customer_note" | "status" | "assigned_to" | "assigned_at" | "production_order_id" | "source_ip_hash" | "user_agent" | "created_at" | "updated_at">>;
      designs: Table<Design, Opt<Design, "id" | "preset_id" | "colors" | "print_text" | "design_json" | "logo_path" | "preview_path" | "created_at">>;
      lead_status_log: Table<LeadStatusLog, Opt<Omit<LeadStatusLog, "id">, "from_status" | "changed_by" | "note" | "created_at">>;
      lead_assignments: Table<LeadAssignment, Opt<Omit<LeadAssignment, "id">, "assigned_to" | "assigned_by" | "created_at">>;
      lead_notes: Table<LeadNote, Opt<Omit<LeadNote, "id">, "author_id" | "created_at">>;
      quotes: Table<Quote, Opt<Quote, "id" | "version" | "status" | "currency" | "subtotal" | "vat_percent" | "vat_amount" | "total" | "valid_until" | "notes" | "pdf_path" | "created_by" | "sent_at" | "responded_at" | "customer_response_note" | "created_at" | "updated_at">>;
      quote_lines: Table<QuoteLine, Opt<Omit<QuoteLine, "line_total">, "id" | "sort_order" | "unit">>;
      quote_tokens: Table<QuoteToken, Opt<QuoteToken, "id" | "revoked_at" | "last_used_at" | "created_at">>;
      rate_limits: Table<RateLimit, Opt<RateLimit, "hits">>;
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
      convert_lead_to_production: { Args: { p_lead_id: Uuid }; Returns: string };
    };
    Enums: { app_role: AppRole; lead_status: LeadStatus; quote_status: QuoteStatus };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

/** Storage buckets (all private). Object path: `<lead_id>/<file>`. */
export const STORAGE_BUCKETS = { logos: "logos", previews: "previews", quotes: "quotes" } as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
