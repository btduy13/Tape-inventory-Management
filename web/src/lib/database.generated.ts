
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "bang_keo_in_orders": {
                  Row: {
                    "don_gia_ban": number | null,"id": string,"is_quote": boolean | null,"mau_sac": string | null,"ngay_du_kien": string,"quy_cach_m": number | null,"quy_cach_mic": number | null,"quy_cach_mm": number | null,"so_luong": number | null,"ten_hang": string | null,"ten_khach_hang": string | null,"thanh_tien_ban": number | null,"thoi_gian": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "don_gia_ban"?: number | null,"id": string,"is_quote"?: boolean | null,"mau_sac"?: string | null,"ngay_du_kien": string,"quy_cach_m"?: number | null,"quy_cach_mic"?: number | null,"quy_cach_mm"?: number | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"thanh_tien_ban"?: number | null,"thoi_gian"?: string | null
                  }
                  Update: {
                    "don_gia_ban"?: number | null,"id"?: string,"is_quote"?: boolean | null,"mau_sac"?: string | null,"ngay_du_kien"?: string,"quy_cach_m"?: number | null,"quy_cach_mic"?: number | null,"quy_cach_mm"?: number | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"thanh_tien_ban"?: number | null,"thoi_gian"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"designs": {
                  Row: {
                    "colors": (string)[],"created_at": string,"design_json": NonNullable<Json>,"id": string,"lead_id": string,"length_m": number,"logo_path": string | null,"preset_id": string | null,"preview_path": string | null,"print_text": string | null,"thickness_mic": number,"width_mm": number
                  }
                  ComputedFields: never
                  Insert: {
                    "colors"?: (string)[],"created_at"?: string,"design_json"?: NonNullable<Json>,"id"?: string,"lead_id": string,"length_m": number,"logo_path"?: string | null,"preset_id"?: string | null,"preview_path"?: string | null,"print_text"?: string | null,"thickness_mic": number,"width_mm": number
                  }
                  Update: {
                    "colors"?: (string)[],"created_at"?: string,"design_json"?: NonNullable<Json>,"id"?: string,"lead_id"?: string,"length_m"?: number,"logo_path"?: string | null,"preset_id"?: string | null,"preview_path"?: string | null,"print_text"?: string | null,"thickness_mic"?: number,"width_mm"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "designs_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "designs_preset_id_fkey"
      columns: ["preset_id"]
isOneToOne: false
      referencedRelation: "tape_presets"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_assignments": {
                  Row: {
                    "assigned_by": string | null,"assigned_to": string | null,"created_at": string,"id": number,"lead_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_by"?: string | null,"assigned_to"?: string | null,"created_at"?: string,"id"?: never,"lead_id": string
                  }
                  Update: {
                    "assigned_by"?: string | null,"assigned_to"?: string | null,"created_at"?: string,"id"?: never,"lead_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_assignments_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_assignments_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_assignments_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_notes": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": number,"lead_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"id"?: never,"lead_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: never,"lead_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_notes_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_status_log": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"from_status": Database["public"]['Enums']["lead_status"] | null,"id": number,"lead_id": string,"note": string | null,"to_status": Database["public"]['Enums']["lead_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["lead_status"] | null,"id"?: never,"lead_id": string,"note"?: string | null,"to_status": Database["public"]['Enums']["lead_status"]
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["lead_status"] | null,"id"?: never,"lead_id"?: string,"note"?: string | null,"to_status"?: Database["public"]['Enums']["lead_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_status_log_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_status_log_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "assigned_at": string | null,"assigned_to": string | null,"code": string,"company": string | null,"created_at": string,"customer_name": string,"customer_note": string | null,"email": string | null,"id": string,"phone": string,"production_order_id": string | null,"quantity": number,"source_ip_hash": string | null,"status": Database["public"]['Enums']["lead_status"],"updated_at": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string | null,"assigned_to"?: string | null,"code"?: string,"company"?: string | null,"created_at"?: string,"customer_name": string,"customer_note"?: string | null,"email"?: string | null,"id"?: string,"phone": string,"production_order_id"?: string | null,"quantity": number,"source_ip_hash"?: string | null,"status"?: Database["public"]['Enums']["lead_status"],"updated_at"?: string,"user_agent"?: string | null
                  }
                  Update: {
                    "assigned_at"?: string | null,"assigned_to"?: string | null,"code"?: string,"company"?: string | null,"created_at"?: string,"customer_name"?: string,"customer_note"?: string | null,"email"?: string | null,"id"?: string,"phone"?: string,"production_order_id"?: string | null,"quantity"?: number,"source_ip_hash"?: string | null,"status"?: Database["public"]['Enums']["lead_status"],"updated_at"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quote_lines": {
                  Row: {
                    "description": string,"id": string,"line_total": number | null,"quantity": number,"quote_id": string,"sort_order": number,"unit": string,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"id"?: string,"line_total"?: never,"quantity": number,"quote_id": string,"sort_order"?: number,"unit"?: string,"unit_price": number
                  }
                  Update: {
                    "description"?: string,"id"?: string,"line_total"?: never,"quantity"?: number,"quote_id"?: string,"sort_order"?: number,"unit"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_lines_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"quote_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"last_used_at": string | null,"quote_id": string,"revoked_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"last_used_at"?: string | null,"quote_id": string,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"last_used_at"?: string | null,"quote_id"?: string,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_tokens_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"quotes": {
                  Row: {
                    "created_at": string,"created_by": string | null,"currency": string,"customer_response_note": string | null,"id": string,"lead_id": string,"notes": string | null,"pdf_path": string | null,"responded_at": string | null,"sent_at": string | null,"status": Database["public"]['Enums']["quote_status"],"subtotal": number,"total": number,"updated_at": string,"valid_until": string | null,"vat_amount": number,"vat_percent": number,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"currency"?: string,"customer_response_note"?: string | null,"id"?: string,"lead_id": string,"notes"?: string | null,"pdf_path"?: string | null,"responded_at"?: string | null,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["quote_status"],"subtotal"?: number,"total"?: number,"updated_at"?: string,"valid_until"?: string | null,"vat_amount"?: number,"vat_percent"?: number,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"currency"?: string,"customer_response_note"?: string | null,"id"?: string,"lead_id"?: string,"notes"?: string | null,"pdf_path"?: string | null,"responded_at"?: string | null,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["quote_status"],"subtotal"?: number,"total"?: number,"updated_at"?: string,"valid_until"?: string | null,"vat_amount"?: number,"vat_percent"?: number,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotes_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tape_presets": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"label": string,"length_m": number,"sort_order": number,"thickness_mic": number,"updated_at": string,"width_mm": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"label": string,"length_m": number,"sort_order"?: number,"thickness_mic": number,"updated_at"?: string,"width_mm": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"label"?: string,"length_m"?: number,"sort_order"?: number,"thickness_mic"?: number,"updated_at"?: string,"width_mm"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "assign_lead":
{ Args: { "p_lead_id": string,"p_user_id": string }; Returns: {
              "assigned_at": string | null,
"assigned_to": string | null,
"code": string,
"company": string | null,
"created_at": string,
"customer_name": string,
"customer_note": string | null,
"email": string | null,
"id": string,
"phone": string,
"production_order_id": string | null,
"quantity": number,
"source_ip_hash": string | null,
"status": Database["public"]['Enums']["lead_status"],
"updated_at": string,
"user_agent": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "leads"
        isOneToOne: true
        isSetofReturn: false
      } },
"can_access_lead":
{ Args: { "p_lead_id": string }; Returns: boolean
                           },
"can_access_lead_path":
{ Args: { "p_name": string }; Returns: boolean
                           },
"change_lead_status":
{ Args: { "p_lead_id": string,"p_note"?: string,"p_to": Database["public"]['Enums']["lead_status"] }; Returns: {
              "assigned_at": string | null,
"assigned_to": string | null,
"code": string,
"company": string | null,
"created_at": string,
"customer_name": string,
"customer_note": string | null,
"email": string | null,
"id": string,
"phone": string,
"production_order_id": string | null,
"quantity": number,
"source_ip_hash": string | null,
"status": Database["public"]['Enums']["lead_status"],
"updated_at": string,
"user_agent": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "leads"
        isOneToOne: true
        isSetofReturn: false
      } },
"check_rate_limit":
{ Args: { "p_key": string,"p_max_hits": number,"p_window_seconds": number }; Returns: boolean
                           },
"convert_lead_to_production":
{ Args: { "p_lead_id": string }; Returns: string
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"electron_app_purge_large_objects":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_internal":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_manager_or_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_service_call":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff_of":
{ Args: { "p_lead_id": string }; Returns: boolean
                           },
"lead_transition_allowed":
{ Args: { "p_from": Database["public"]['Enums']["lead_status"],"p_to": Database["public"]['Enums']["lead_status"] }; Returns: boolean
                           },
"next_bang_keo_in_order_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"quotes_recalc_totals":
{ Args: { "p_quote_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "admin"|"manager"|"staff"|"ctv","lead_status": "new"|"assigned"|"consulting"|"quoted"|"accepted"|"production"|"shipping"|"done"|"cancelled","quote_status": "draft"|"sent"|"accepted"|"changes_requested"|"expired"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin", "manager", "staff", "ctv"],"lead_status": ["new", "assigned", "consulting", "quoted", "accepted", "production", "shipping", "done", "cancelled"],"quote_status": ["draft", "sent", "accepted", "changes_requested", "expired", "cancelled"]
          }
        }
} as const
