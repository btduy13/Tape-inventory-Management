
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
                    "cong_no_khach": number | null,"cong_no_ncc": number | null,"ctv": string | null,"cuon_cay": number | null,"customer_id": string | null,"da_giao": boolean | null,"da_gui_email": boolean | null,"da_tat_toan": boolean | null,"dia_chi_khach_hang": string | null,"don_gia_ban": number | null,"don_gia_goc": number | null,"don_gia_von": number | null,"hoa_hong": number | null,"id": string,"is_quote": boolean | null,"loai_truc": string | null,"loi_giay": string | null,"loi_nhuan": number | null,"loi_nhuan_rong": number | null,"mau_keo": string | null,"mau_sac": string | null,"ngay_du_kien": string,"phi_cat": number | null,"phi_keo": number | null,"phi_mau": number | null,"phi_size": number | null,"phi_sl": number | null,"quote_items": Json | null,"quy_cach_m": number | null,"quy_cach_mic": number | null,"quy_cach_mm": number | null,"sdt_khach_hang": string | null,"so_luong": number | null,"ten_hang": string | null,"ten_khach_hang": string | null,"ten_truc": string | null,"thanh_tien_ban": number | null,"thanh_tien_goc": number | null,"thoi_gian": string | null,"thung_bao": string | null,"tien_coc": number | null,"tien_hoa_hong": number | null,"tien_ship": number | null,"truc_chu_vi": number | null,"truc_ctv": string | null,"truc_gia_ban": number | null,"truc_gia_goc": number | null,"truc_hoa_hong": number | null,"truc_loi_nhuan": number | null,"truc_loi_nhuan_rong": number | null,"truc_so_luong": number | null,"truc_thanh_tien_ban": number | null,"truc_thanh_tien_goc": number | null,"truc_tien_hoa_hong": number | null,"truc_vat": number | null,"truc_vat_percent": number | null,"vat": number | null,"vat_percent": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cong_no_khach"?: number | null,"cong_no_ncc"?: number | null,"ctv"?: string | null,"cuon_cay"?: number | null,"customer_id"?: string | null,"da_giao"?: boolean | null,"da_gui_email"?: boolean | null,"da_tat_toan"?: boolean | null,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number | null,"don_gia_goc"?: number | null,"don_gia_von"?: number | null,"hoa_hong"?: number | null,"id": string,"is_quote"?: boolean | null,"loai_truc"?: string | null,"loi_giay"?: string | null,"loi_nhuan"?: number | null,"loi_nhuan_rong"?: number | null,"mau_keo"?: string | null,"mau_sac"?: string | null,"ngay_du_kien": string,"phi_cat"?: number | null,"phi_keo"?: number | null,"phi_mau"?: number | null,"phi_size"?: number | null,"phi_sl"?: number | null,"quote_items"?: Json | null,"quy_cach_m"?: number | null,"quy_cach_mic"?: number | null,"quy_cach_mm"?: number | null,"sdt_khach_hang"?: string | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"ten_truc"?: string | null,"thanh_tien_ban"?: number | null,"thanh_tien_goc"?: number | null,"thoi_gian"?: string | null,"thung_bao"?: string | null,"tien_coc"?: number | null,"tien_hoa_hong"?: number | null,"tien_ship"?: number | null,"truc_chu_vi"?: number | null,"truc_ctv"?: string | null,"truc_gia_ban"?: number | null,"truc_gia_goc"?: number | null,"truc_hoa_hong"?: number | null,"truc_loi_nhuan"?: number | null,"truc_loi_nhuan_rong"?: number | null,"truc_so_luong"?: number | null,"truc_thanh_tien_ban"?: number | null,"truc_thanh_tien_goc"?: number | null,"truc_tien_hoa_hong"?: number | null,"truc_vat"?: number | null,"truc_vat_percent"?: number | null,"vat"?: number | null,"vat_percent"?: number | null
                  }
                  Update: {
                    "cong_no_khach"?: number | null,"cong_no_ncc"?: number | null,"ctv"?: string | null,"cuon_cay"?: number | null,"customer_id"?: string | null,"da_giao"?: boolean | null,"da_gui_email"?: boolean | null,"da_tat_toan"?: boolean | null,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number | null,"don_gia_goc"?: number | null,"don_gia_von"?: number | null,"hoa_hong"?: number | null,"id"?: string,"is_quote"?: boolean | null,"loai_truc"?: string | null,"loi_giay"?: string | null,"loi_nhuan"?: number | null,"loi_nhuan_rong"?: number | null,"mau_keo"?: string | null,"mau_sac"?: string | null,"ngay_du_kien"?: string,"phi_cat"?: number | null,"phi_keo"?: number | null,"phi_mau"?: number | null,"phi_size"?: number | null,"phi_sl"?: number | null,"quote_items"?: Json | null,"quy_cach_m"?: number | null,"quy_cach_mic"?: number | null,"quy_cach_mm"?: number | null,"sdt_khach_hang"?: string | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"ten_truc"?: string | null,"thanh_tien_ban"?: number | null,"thanh_tien_goc"?: number | null,"thoi_gian"?: string | null,"thung_bao"?: string | null,"tien_coc"?: number | null,"tien_hoa_hong"?: number | null,"tien_ship"?: number | null,"truc_chu_vi"?: number | null,"truc_ctv"?: string | null,"truc_gia_ban"?: number | null,"truc_gia_goc"?: number | null,"truc_hoa_hong"?: number | null,"truc_loi_nhuan"?: number | null,"truc_loi_nhuan_rong"?: number | null,"truc_so_luong"?: number | null,"truc_thanh_tien_ban"?: number | null,"truc_thanh_tien_goc"?: number | null,"truc_tien_hoa_hong"?: number | null,"truc_vat"?: number | null,"truc_vat_percent"?: number | null,"vat"?: number | null,"vat_percent"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bang_keo_in_orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"bang_keo_orders": {
                  Row: {
                    "cong_no_khach": number | null,"cong_no_ncc": number | null,"ctv": string | null,"customer_id": string | null,"da_giao": boolean | null,"da_gui_email": boolean | null,"da_tat_toan": boolean | null,"dia_chi_khach_hang": string | null,"don_gia_ban": number | null,"don_gia_goc": number | null,"hoa_hong": number | null,"id": string,"is_quote": boolean | null,"loi_nhuan": number | null,"loi_nhuan_rong": number | null,"mau_sac": string | null,"ngay_du_kien": string,"quote_items": Json | null,"quy_cach": string | null,"sdt_khach_hang": string | null,"so_luong": number | null,"ten_hang": string | null,"ten_khach_hang": string | null,"thanh_tien": number | null,"thanh_tien_ban": number | null,"thoi_gian": string | null,"tien_hoa_hong": number | null,"tien_ship": number | null,"vat": number | null,"vat_percent": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cong_no_khach"?: number | null,"cong_no_ncc"?: number | null,"ctv"?: string | null,"customer_id"?: string | null,"da_giao"?: boolean | null,"da_gui_email"?: boolean | null,"da_tat_toan"?: boolean | null,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number | null,"don_gia_goc"?: number | null,"hoa_hong"?: number | null,"id": string,"is_quote"?: boolean | null,"loi_nhuan"?: number | null,"loi_nhuan_rong"?: number | null,"mau_sac"?: string | null,"ngay_du_kien": string,"quote_items"?: Json | null,"quy_cach"?: string | null,"sdt_khach_hang"?: string | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"thanh_tien"?: number | null,"thanh_tien_ban"?: number | null,"thoi_gian"?: string | null,"tien_hoa_hong"?: number | null,"tien_ship"?: number | null,"vat"?: number | null,"vat_percent"?: number | null
                  }
                  Update: {
                    "cong_no_khach"?: number | null,"cong_no_ncc"?: number | null,"ctv"?: string | null,"customer_id"?: string | null,"da_giao"?: boolean | null,"da_gui_email"?: boolean | null,"da_tat_toan"?: boolean | null,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number | null,"don_gia_goc"?: number | null,"hoa_hong"?: number | null,"id"?: string,"is_quote"?: boolean | null,"loi_nhuan"?: number | null,"loi_nhuan_rong"?: number | null,"mau_sac"?: string | null,"ngay_du_kien"?: string,"quote_items"?: Json | null,"quy_cach"?: string | null,"sdt_khach_hang"?: string | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"thanh_tien"?: number | null,"thanh_tien_ban"?: number | null,"thoi_gian"?: string | null,"tien_hoa_hong"?: number | null,"tien_ship"?: number | null,"vat"?: number | null,"vat_percent"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bang_keo_orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_backfill_log": {
                  Row: {
                    "applied_at": string,"applied_by": string | null,"customer_created": boolean,"customer_id": string,"group_key": string | null,"id": number,"source_id": string,"source_table": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string,"applied_by"?: string | null,"customer_created"?: boolean,"customer_id": string,"group_key"?: string | null,"id"?: number,"source_id": string,"source_table": string
                  }
                  Update: {
                    "applied_at"?: string,"applied_by"?: string | null,"customer_created"?: boolean,"customer_id"?: string,"group_key"?: string | null,"id"?: number,"source_id"?: string,"source_table"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customer_match_candidates": {
                  Row: {
                    "created_at": string,"customer_id": string | null,"decision": string,"dia_chi_khach_hang": string | null,"group_key": string | null,"name_norm": string | null,"phone_norm": string | null,"reason": string,"resolved_at": string | null,"resolved_by": string | null,"sdt_khach_hang": string | null,"source_id": string,"source_table": string,"status": string,"ten_khach_hang": string | null,"thoi_gian": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id"?: string | null,"decision": string,"dia_chi_khach_hang"?: string | null,"group_key"?: string | null,"name_norm"?: string | null,"phone_norm"?: string | null,"reason": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"sdt_khach_hang"?: string | null,"source_id": string,"source_table": string,"status"?: string,"ten_khach_hang"?: string | null,"thoi_gian"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string | null,"decision"?: string,"dia_chi_khach_hang"?: string | null,"group_key"?: string | null,"name_norm"?: string | null,"phone_norm"?: string | null,"reason"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"sdt_khach_hang"?: string | null,"source_id"?: string,"source_table"?: string,"status"?: string,"ten_khach_hang"?: string | null,"thoi_gian"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "address": string | null,"company": string | null,"created_at": string,"id": string,"name": string,"note": string | null,"phone": string | null,"phone_norm": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"company"?: string | null,"created_at"?: string,"id"?: string,"name": string,"note"?: string | null,"phone"?: string | null,"phone_norm"?: never,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"company"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"note"?: string | null,"phone"?: string | null,"phone_norm"?: never,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"delivery_notes": {
                  Row: {
                    "confirmed_at": string | null,"created_at": string,"created_by": string | null,"id": string,"job_id": string,"photo_path": string | null,"recipient_address": string | null,"recipient_name": string | null,"recipient_phone": string | null,"revoked_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"job_id": string,"photo_path"?: string | null,"recipient_address"?: string | null,"recipient_name"?: string | null,"recipient_phone"?: string | null,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "confirmed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"job_id"?: string,"photo_path"?: string | null,"recipient_address"?: string | null,"recipient_name"?: string | null,"recipient_phone"?: string | null,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_notes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_notes_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "production_jobs"
      referencedColumns: ["id"]
    }
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
                },"email_history": {
                  Row: {
                    "email_address": string,"id": number,"last_sent_at": string,"sent_count": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "email_address": string,"id"?: number,"last_sent_at"?: string,"sent_count"?: number | null
                  }
                  Update: {
                    "email_address"?: string,"id"?: number,"last_sent_at"?: string,"sent_count"?: number | null
                  }
                  Relationships: [
                    
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
                    "assigned_at": string | null,"assigned_to": string | null,"code": string,"company": string | null,"created_at": string,"customer_id": string | null,"customer_name": string,"customer_note": string | null,"email": string | null,"id": string,"phone": string,"production_order_id": string | null,"quantity": number,"source_ip_hash": string | null,"status": Database["public"]['Enums']["lead_status"],"updated_at": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string | null,"assigned_to"?: string | null,"code"?: string,"company"?: string | null,"created_at"?: string,"customer_id"?: string | null,"customer_name": string,"customer_note"?: string | null,"email"?: string | null,"id"?: string,"phone": string,"production_order_id"?: string | null,"quantity": number,"source_ip_hash"?: string | null,"status"?: Database["public"]['Enums']["lead_status"],"updated_at"?: string,"user_agent"?: string | null
                  }
                  Update: {
                    "assigned_at"?: string | null,"assigned_to"?: string | null,"code"?: string,"company"?: string | null,"created_at"?: string,"customer_id"?: string | null,"customer_name"?: string,"customer_note"?: string | null,"email"?: string | null,"id"?: string,"phone"?: string,"production_order_id"?: string | null,"quantity"?: number,"source_ip_hash"?: string | null,"status"?: Database["public"]['Enums']["lead_status"],"updated_at"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"order_attachments": {
                  Row: {
                    "content_type": string | null,"created_at": string | null,"data": string | null,"file_name": string,"file_size": number | null,"id": number,"order_id": string,"order_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type"?: string | null,"created_at"?: string | null,"data"?: string | null,"file_name": string,"file_size"?: number | null,"id"?: number,"order_id": string,"order_type": string
                  }
                  Update: {
                    "content_type"?: string | null,"created_at"?: string | null,"data"?: string | null,"file_name"?: string,"file_size"?: number | null,"id"?: number,"order_id"?: string,"order_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"production_jobs": {
                  Row: {
                    "assigned_at": string | null,"converted_at": string | null,"converted_by": string | null,"created_at": string,"due_date": string | null,"id": string,"lead_id": string | null,"order_id": string | null,"order_table": string,"production_note": string | null,"step": Database["public"]['Enums']["production_step"],"updated_at": string,"workshop_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string | null,"converted_at"?: string | null,"converted_by"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"lead_id"?: string | null,"order_id"?: string | null,"order_table"?: string,"production_note"?: string | null,"step"?: Database["public"]['Enums']["production_step"],"updated_at"?: string,"workshop_user_id"?: string | null
                  }
                  Update: {
                    "assigned_at"?: string | null,"converted_at"?: string | null,"converted_by"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"lead_id"?: string | null,"order_id"?: string | null,"order_table"?: string,"production_note"?: string | null,"step"?: Database["public"]['Enums']["production_step"],"updated_at"?: string,"workshop_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "production_jobs_converted_by_fkey"
      columns: ["converted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "production_jobs_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: true
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "production_jobs_workshop_user_id_fkey"
      columns: ["workshop_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"production_step_log": {
                  Row: {
                    "changed_by": string | null,"changed_by_name": string | null,"created_at": string,"from_step": Database["public"]['Enums']["production_step"] | null,"id": number,"job_id": string,"note": string | null,"to_step": Database["public"]['Enums']["production_step"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"changed_by_name"?: string | null,"created_at"?: string,"from_step"?: Database["public"]['Enums']["production_step"] | null,"id"?: never,"job_id": string,"note"?: string | null,"to_step": Database["public"]['Enums']["production_step"]
                  }
                  Update: {
                    "changed_by"?: string | null,"changed_by_name"?: string | null,"created_at"?: string,"from_step"?: Database["public"]['Enums']["production_step"] | null,"id"?: never,"job_id"?: string,"note"?: string | null,"to_step"?: Database["public"]['Enums']["production_step"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "production_step_log_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "production_step_log_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "production_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"is_active": boolean,"nav_tabs": (string)[] | null,"permissions": (string)[],"phone": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"is_active"?: boolean,"nav_tabs"?: (string)[] | null,"permissions"?: (string)[],"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"nav_tabs"?: (string)[] | null,"permissions"?: (string)[],"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
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
                },"tape_spec_settings": {
                  Row: {
                    "id": boolean,"max_length_m": number,"min_length_m": number,"thickness_mic": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"max_length_m": number,"min_length_m": number,"thickness_mic"?: number,"updated_at"?: string
                  }
                  Update: {
                    "id"?: boolean,"max_length_m"?: number,"min_length_m"?: number,"thickness_mic"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tape_widths": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"sort_order": number,"updated_at": string,"width_mm": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"sort_order"?: number,"updated_at"?: string,"width_mm": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"sort_order"?: number,"updated_at"?: string,"width_mm"?: number
                  }
                  Relationships: [
                    
                  ]
                },"thank_you_migration_map": {
                  Row: {
                    "migrated_at": string,"new_id": string,"old_id": string,"old_row": NonNullable<Json>,"old_table": string
                  }
                  ComputedFields: never
                  Insert: {
                    "migrated_at"?: string,"new_id": string,"old_id": string,"old_row": NonNullable<Json>,"old_table": string
                  }
                  Update: {
                    "migrated_at"?: string,"new_id"?: string,"old_id"?: string,"old_row"?: NonNullable<Json>,"old_table"?: string
                  }
                  Relationships: [
                    
                  ]
                },"thank_you_orders": {
                  Row: {
                    "cong_no_khach": number,"cong_no_ncc": number,"ctv": string | null,"customer_id": string | null,"da_giao": boolean,"da_gui_email": boolean,"da_tat_toan": boolean,"dia_chi_khach_hang": string | null,"don_gia_ban": number,"don_gia_von": number,"ghi_chu": string | null,"hoa_hong": number,"id": string,"is_quote": boolean,"kich_thuoc": string | null,"loi_nhuan": number,"loi_nhuan_rong": number,"mau_sac": string | null,"ngay_du_kien": string,"sdt_khach_hang": string | null,"so_luong": number,"ten_hang": string,"ten_khach_hang": string | null,"thanh_tien_ban": number,"thanh_tien_von": number,"thoi_gian": string,"tien_coc": number,"tien_hoa_hong": number,"tien_ship": number,"vat": number,"vat_percent": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cong_no_khach"?: number,"cong_no_ncc"?: number,"ctv"?: string | null,"customer_id"?: string | null,"da_giao"?: boolean,"da_gui_email"?: boolean,"da_tat_toan"?: boolean,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number,"don_gia_von"?: number,"ghi_chu"?: string | null,"hoa_hong"?: number,"id": string,"is_quote"?: boolean,"kich_thuoc"?: string | null,"loi_nhuan"?: number,"loi_nhuan_rong"?: number,"mau_sac"?: string | null,"ngay_du_kien": string,"sdt_khach_hang"?: string | null,"so_luong"?: number,"ten_hang": string,"ten_khach_hang"?: string | null,"thanh_tien_ban"?: number,"thanh_tien_von"?: number,"thoi_gian"?: string,"tien_coc"?: number,"tien_hoa_hong"?: number,"tien_ship"?: number,"vat"?: number,"vat_percent"?: number
                  }
                  Update: {
                    "cong_no_khach"?: number,"cong_no_ncc"?: number,"ctv"?: string | null,"customer_id"?: string | null,"da_giao"?: boolean,"da_gui_email"?: boolean,"da_tat_toan"?: boolean,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number,"don_gia_von"?: number,"ghi_chu"?: string | null,"hoa_hong"?: number,"id"?: string,"is_quote"?: boolean,"kich_thuoc"?: string | null,"loi_nhuan"?: number,"loi_nhuan_rong"?: number,"mau_sac"?: string | null,"ngay_du_kien"?: string,"sdt_khach_hang"?: string | null,"so_luong"?: number,"ten_hang"?: string,"ten_khach_hang"?: string | null,"thanh_tien_ban"?: number,"thanh_tien_von"?: number,"thoi_gian"?: string,"tien_coc"?: number,"tien_hoa_hong"?: number,"tien_ship"?: number,"vat"?: number,"vat_percent"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "thank_you_orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"truc_in_orders": {
                  Row: {
                    "cong_no_khach": number | null,"cong_no_ncc": number | null,"ctv": string | null,"customer_id": string | null,"da_giao": boolean | null,"da_gui_email": boolean | null,"da_tat_toan": boolean | null,"dia_chi_khach_hang": string | null,"don_gia_ban": number | null,"don_gia_goc": number | null,"hoa_hong": number | null,"id": string,"is_quote": boolean | null,"loi_nhuan": number | null,"loi_nhuan_rong": number | null,"mau_keo": string | null,"mau_sac": string | null,"ngay_du_kien": string,"quote_items": Json | null,"quy_cach": string | null,"sdt_khach_hang": string | null,"so_luong": number | null,"ten_hang": string | null,"ten_khach_hang": string | null,"thanh_tien_ban": number | null,"thanh_tien_goc": number | null,"thoi_gian": string | null,"tien_hoa_hong": number | null,"tien_ship": number | null,"vat": number | null,"vat_percent": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cong_no_khach"?: number | null,"cong_no_ncc"?: number | null,"ctv"?: string | null,"customer_id"?: string | null,"da_giao"?: boolean | null,"da_gui_email"?: boolean | null,"da_tat_toan"?: boolean | null,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number | null,"don_gia_goc"?: number | null,"hoa_hong"?: number | null,"id": string,"is_quote"?: boolean | null,"loi_nhuan"?: number | null,"loi_nhuan_rong"?: number | null,"mau_keo"?: string | null,"mau_sac"?: string | null,"ngay_du_kien": string,"quote_items"?: Json | null,"quy_cach"?: string | null,"sdt_khach_hang"?: string | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"thanh_tien_ban"?: number | null,"thanh_tien_goc"?: number | null,"thoi_gian"?: string | null,"tien_hoa_hong"?: number | null,"tien_ship"?: number | null,"vat"?: number | null,"vat_percent"?: number | null
                  }
                  Update: {
                    "cong_no_khach"?: number | null,"cong_no_ncc"?: number | null,"ctv"?: string | null,"customer_id"?: string | null,"da_giao"?: boolean | null,"da_gui_email"?: boolean | null,"da_tat_toan"?: boolean | null,"dia_chi_khach_hang"?: string | null,"don_gia_ban"?: number | null,"don_gia_goc"?: number | null,"hoa_hong"?: number | null,"id"?: string,"is_quote"?: boolean | null,"loi_nhuan"?: number | null,"loi_nhuan_rong"?: number | null,"mau_keo"?: string | null,"mau_sac"?: string | null,"ngay_du_kien"?: string,"quote_items"?: Json | null,"quy_cach"?: string | null,"sdt_khach_hang"?: string | null,"so_luong"?: number | null,"ten_hang"?: string | null,"ten_khach_hang"?: string | null,"thanh_tien_ban"?: number | null,"thanh_tien_goc"?: number | null,"thoi_gian"?: string | null,"tien_hoa_hong"?: number | null,"tien_ship"?: number | null,"vat"?: number | null,"vat_percent"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "truc_in_orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_customer_create":
{ Args: { "p_payload": Json }; Returns: string
                           },
"admin_customer_get":
{ Args: { "p_id": string }; Returns: Json
                           },
"admin_customer_merge":
{ Args: { "p_sources": (string)[],"p_target": string }; Returns: number
                           },
"admin_customer_review_list":
{ Args: { "p_limit"?: number,"p_offset"?: number }; Returns: {
              "dia_chi_khach_hang": string,"group_ids": (string)[],"group_size": number,"order_type": string,"reason": string,"sdt_khach_hang": string,"source_id": string,"source_table": string,"suggestions": Json,"ten_khach_hang": string,"thoi_gian": string,"total_count": number
            }[]
                           },
"admin_customer_review_resolve":
{ Args: { "p_customer_id"?: string,"p_source_id": string,"p_source_table": string }; Returns: undefined
                           },
"admin_customer_update":
{ Args: { "p_id": string,"p_payload": Json }; Returns: Json
                           },
"admin_customers_list":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_q"?: string }; Returns: {
              "address": string,"company": string,"cong_no_khach": number,"created_at": string,"id": string,"last_order_at": string,"name": string,"note": string,"order_count": number,"phone": string,"phone_norm": string,"quote_count": number,"sum_cong_no_khach": number,"tong_tien": number,"total_count": number,"updated_at": string
            }[]
                           },
"admin_dashboard":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_order_attachment_add":
{ Args: { "p_base64": string,"p_content_type": string,"p_file_name": string,"p_id": string,"p_type": string }; Returns: number
                           },
"admin_order_attachment_delete":
{ Args: { "p_attachment_id": number }; Returns: number
                           },
"admin_order_attachment_get":
{ Args: { "p_attachment_id": number }; Returns: {
              "base64_data": string,"content_type": string,"file_name": string,"file_size": number,"id": number,"order_id": string,"order_type": string
            }[]
                           },
"admin_order_attachments":
{ Args: { "p_id": string,"p_type": string }; Returns: {
              "content_type": string,"created_at": string,"file_name": string,"file_size": number,"id": number
            }[]
                           },
"admin_order_create":
{ Args: { "p_is_quote"?: boolean,"p_payload": Json,"p_type"?: string }; Returns: {
              "job_id": string,"order_id": string
            }[]
                           },
"admin_order_delete":
{ Args: { "p_ids": (string)[],"p_quote_only"?: boolean,"p_type": string }; Returns: number
                           },
"admin_order_get":
{ Args: { "p_id": string,"p_type"?: string }; Returns: Json
                           },
"admin_order_latest_by_name":
{ Args: { "p_name": string,"p_type": string }; Returns: Json
                           },
"admin_order_name_suggest":
{ Args: { "p_q": string,"p_type": string }; Returns: string[]
                           },
"admin_order_send_to_workshop":
{ Args: { "p_id": string,"p_workshop_user_id"?: string }; Returns: string
                           },
"admin_order_set_status":
{ Args: { "p_da_giao"?: boolean,"p_da_tat_toan"?: boolean,"p_ids": (string)[],"p_type": string }; Returns: number
                           },
"admin_order_update":
{ Args: { "p_id": string,"p_payload": Json,"p_type": string }; Returns: Json
                           },
"admin_orders_filtered":
{ Args: { "p_filter": Json,"p_type": string }; Returns: {
              "cong_no_khach": number,"cong_no_ncc": number,"ctv": string,"customer_id": string,"da_giao": boolean,"da_gui_email": boolean,"da_tat_toan": boolean,"dia_chi_khach_hang": string,"don_gia_ban": number,"has_quote_items": boolean,"id": string,"is_quote": boolean,"job_id": string,"lead_id": string,"loai_truc": string,"loi_nhuan_rong": number,"mau_sac": string,"ngay_du_kien": string,"quy_cach": string,"sdt_khach_hang": string,"so_luong": number,"step": Database["public"]['Enums']["production_step"],"ten_hang": string,"ten_khach_hang": string,"ten_truc": string,"thanh_tien_ban": number,"thoi_gian": string,"tien_coc": number,"tien_von": number,"tong_tien": number,"truc_chu_vi": number,"truc_ctv": string,"truc_hoa_hong": number,"truc_loi_nhuan_rong": number,"truc_so_luong": number,"truc_thanh_tien_ban": number,"truc_tien_hoa_hong": number,"type": string,"vat": number,"workshop_user_id": string,"workshop_user_name": string
            }[]
                           },
"admin_orders_for_export":
{ Args: { "p_ids": (string)[] }; Returns: {
              "cong_no_khach": number,"customer_id": string,"customer_name": string,"da_giao": boolean,"da_tat_toan": boolean,"dia_chi_khach_hang": string,"don_gia_ban": number,"id": string,"loai_truc": string,"mau_keo": string,"mau_sac": string,"ngay_du_kien": string,"quote_items": Json,"quy_cach": string,"quy_cach_m": number,"quy_cach_mic": number,"quy_cach_mm": number,"sdt_khach_hang": string,"so_luong": number,"ten_hang": string,"ten_khach_hang": string,"ten_truc": string,"thanh_tien_ban": number,"thoi_gian": string,"tien_coc": number,"truc_chu_vi": number,"truc_gia_ban": number,"truc_so_luong": number,"truc_thanh_tien_ban": number,"truc_vat": number,"truc_vat_percent": number,"type": string,"vat": number,"vat_percent": number
            }[]
                           },
"admin_orders_list":
{ Args: { "p_filter"?: Json,"p_type"?: string }; Returns: {
              "cong_no_khach": number,"cong_no_ncc": number,"ctv": string,"customer_id": string,"da_giao": boolean,"da_gui_email": boolean,"da_tat_toan": boolean,"dia_chi_khach_hang": string,"don_gia_ban": number,"has_quote_items": boolean,"id": string,"is_quote": boolean,"job_id": string,"lead_id": string,"loai_truc": string,"loi_nhuan_rong": number,"mau_sac": string,"ngay_du_kien": string,"quy_cach": string,"sdt_khach_hang": string,"so_luong": number,"step": Database["public"]['Enums']["production_step"],"ten_hang": string,"ten_khach_hang": string,"ten_truc": string,"thanh_tien_ban": number,"thoi_gian": string,"tien_coc": number,"tien_von": number,"tong_tien": number,"truc_chu_vi": number,"truc_ctv": string,"truc_hoa_hong": number,"truc_loi_nhuan_rong": number,"truc_so_luong": number,"truc_thanh_tien_ban": number,"truc_tien_hoa_hong": number,"type": string,"vat": number,"workshop_user_id": string,"workshop_user_name": string
            }[]
                           },
"admin_orders_totals":
{ Args: { "p_filter"?: Json,"p_type"?: string }; Returns: {
              "count_due_soon": number,"count_overdue": number,"count_settled": number,"count_unsettled": number,"sum_cong_no_khach": number,"sum_cong_no_ncc": number,"sum_loi_nhuan_rong": number,"sum_tong_tien": number,"total_count": number
            }[]
                           },
"admin_quote_convert":
{ Args: { "p_id": string,"p_ngay_du_kien": string,"p_type": string }; Returns: string
                           },
"admin_workshop_set_steps":
{ Args: { "p_jobs": Json,"p_to": Database["public"]['Enums']["production_step"] }; Returns: number
                           },
"advance_production_step":
{ Args: { "p_job_id": string,"p_note"?: string,"p_to": Database["public"]['Enums']["production_step"] }; Returns: {
              "assigned_at": string | null,
"converted_at": string | null,
"converted_by": string | null,
"created_at": string,
"due_date": string | null,
"id": string,
"lead_id": string | null,
"order_id": string | null,
"order_table": string,
"production_note": string | null,
"step": Database["public"]['Enums']["production_step"],
"updated_at": string,
"workshop_user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "production_jobs"
        isOneToOne: true
        isSetofReturn: false
      } },
"assign_lead":
{ Args: { "p_lead_id": string,"p_user_id": string }; Returns: {
              "assigned_at": string | null,
"assigned_to": string | null,
"code": string,
"company": string | null,
"created_at": string,
"customer_id": string | null,
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
"assign_production_job":
{ Args: { "p_lead_id": string,"p_user_id": string }; Returns: {
              "assigned_at": string | null,
"converted_at": string | null,
"converted_by": string | null,
"created_at": string,
"due_date": string | null,
"id": string,
"lead_id": string | null,
"order_id": string | null,
"order_table": string,
"production_note": string | null,
"step": Database["public"]['Enums']["production_step"],
"updated_at": string,
"workshop_user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "production_jobs"
        isOneToOne: true
        isSetofReturn: false
      } },
"assign_workshop_job":
{ Args: { "p_job_id": string,"p_user_id": string }; Returns: {
              "assigned_at": string | null,
"converted_at": string | null,
"converted_by": string | null,
"created_at": string,
"due_date": string | null,
"id": string,
"lead_id": string | null,
"order_id": string | null,
"order_table": string,
"production_note": string | null,
"step": Database["public"]['Enums']["production_step"],
"updated_at": string,
"workshop_user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "production_jobs"
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
"customer_id": string | null,
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
"confirm_delivery":
{ Args: { "p_photo_path": string,"p_token_hash": string }; Returns: {
              "confirmed_at": string,"job_id": string,"note_id": string
            }[]
                           },
"convert_lead_to_production":
{ Args: { "p_due_date": string,"p_lead_id": string,"p_note"?: string,"p_workshop_user_id"?: string }; Returns: string
                           },
"create_delivery_note":
{ Args: { "p_job_id": string }; Returns: {
              "colors": (string)[],"created_at": string,"due_date": string,"job_id": string,"length_m": number,"note_id": string,"order_id": string,"order_name": string,"print_text": string,"quantity": number,"recipient_address": string,"recipient_name": string,"recipient_phone": string,"thickness_mic": number,"token": string,"width_mm": number
            }[]
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"customer_backfill_apply":
{ Args: Record<PropertyKey, never>; Returns: {
              "customers_created": number,"rows_linked": number
            }[]
                           },
"customer_backfill_dry_run":
{ Args: Record<PropertyKey, never>; Returns: {
              "decision": string,"n": number,"reason": string
            }[]
                           },
"customer_clean_payload":
{ Args: { "p_payload": Json }; Returns: Json
                           },
"customer_find_or_create":
{ Args: { "p_address"?: string,"p_company"?: string,"p_name": string,"p_phone": string }; Returns: string
                           },
"customer_order_rows":
{ Args: { "p_customer_id"?: string }; Returns: {
              "cong_no_khach": number,"customer_id": string,"da_giao": boolean,"da_tat_toan": boolean,"id": string,"is_quote": boolean,"ngay_du_kien": string,"so_luong": number,"ten_hang": string,"thoi_gian": string,"tong_tien": number,"type": string
            }[]
                           },
"delivery_note_by_token":
{ Args: { "p_token_hash": string }; Returns: {
              "confirmed_at": string,"created_at": string,"job_id": string,"job_step": Database["public"]['Enums']["production_step"],"note_id": string,"order_name": string,"quantity": number,"recipient_name": string,"status": string
            }[]
                           },
"electron_app_purge_large_objects":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"electron_customer_create":
{ Args: { "p_address"?: string,"p_company"?: string,"p_name": string,"p_phone"?: string }; Returns: string
                           },
"electron_customer_search":
{ Args: { "p_id"?: string,"p_limit"?: number,"p_q"?: string }; Returns: {
              "address": string,"company": string,"id": string,"name": string,"phone": string
            }[]
                           },
"has_perm":
{ Args: { "p": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_internal":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_job_handoff":
{ Args: { "p_new": Omit<Database["public"]['Tables']["leads"]['Row'], Database["public"]['Tables']["leads"]['ComputedFields']>,"p_old": Omit<Database["public"]['Tables']["leads"]['Row'], Database["public"]['Tables']["leads"]['ComputedFields']> }; Returns: boolean
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
"is_workshop":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lead_transition_allowed":
{ Args: { "p_from": Database["public"]['Enums']["lead_status"],"p_to": Database["public"]['Enums']["lead_status"] }; Returns: boolean
                           },
"next_bang_keo_in_order_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"next_order_id":
{ Args: { "p_at"?: string,"p_quote"?: boolean,"p_type": string }; Returns: string
                           },
"normalize_customer_name":
{ Args: { "p_name": string }; Returns: string
                           },
"normalize_vn_phone":
{ Args: { "p_phone": string }; Returns: string
                           },
"order_clean_payload":
{ Args: { "p_extra"?: (string)[],"p_payload": Json,"p_type": string }; Returns: Json
                           },
"order_compute":
{ Args: { "p_type": string,"r": Json }; Returns: Json
                           },
"order_fields":
{ Args: { "p_type": string }; Returns: {
              "kind": string,"max_len": number,"name": string
            }[]
                           },
"order_hide_money":
{ Args: { "p_row": Json }; Returns: Json
                           },
"order_payload_num":
{ Args: { "p_key": string,"p_payload": Json }; Returns: number
                           },
"order_payload_text":
{ Args: { "p_key": string,"p_max": number,"p_payload": Json }; Returns: string
                           },
"order_type_meta":
{ Args: { "p_type": string }; Returns: {
              "customer_debt": string,"prefix": string,"supplier_debt": string,"tbl": string
            }[]
                           },
"order_write":
{ Args: { "p_id"?: string,"p_row": Json,"p_type": string }; Returns: number
                           },
"production_apply_step":
{ Args: { "p_by_name"?: string,"p_job_id": string,"p_note"?: string,"p_to": Database["public"]['Enums']["production_step"] }; Returns: {
              "assigned_at": string | null,
"converted_at": string | null,
"converted_by": string | null,
"created_at": string,
"due_date": string | null,
"id": string,
"lead_id": string | null,
"order_id": string | null,
"order_table": string,
"production_note": string | null,
"step": Database["public"]['Enums']["production_step"],
"updated_at": string,
"workshop_user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "production_jobs"
        isOneToOne: true
        isSetofReturn: false
      } },
"production_step_label":
{ Args: { "p_step": Database["public"]['Enums']["production_step"] }; Returns: string
                           },
"production_step_next":
{ Args: { "p_step": Database["public"]['Enums']["production_step"] }; Returns: Database["public"]['Enums']["production_step"]
                           },
"production_sync_lead":
{ Args: { "p_lead_id": string,"p_step": Database["public"]['Enums']["production_step"] }; Returns: undefined
                           },
"quotes_recalc_totals":
{ Args: { "p_quote_id": string }; Returns: undefined
                           },
"thank_you_move_legacy":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"workshop_jobs":
{ Args: { "p_job_id"?: string }; Returns: {
              "colors": (string)[],"converted_at": string,"design_json": Json,"desktop_delivered": boolean,"due_date": string,"job_id": string,"lead_code": string,"lead_id": string,"length_m": number,"logo_path": string,"order_id": string,"order_name": string,"order_table": string,"preview_path": string,"print_text": string,"production_note": string,"quantity": number,"step": Database["public"]['Enums']["production_step"],"thickness_mic": number,"updated_at": string,"width_mm": number,"workshop_user_id": string,"workshop_user_name": string
            }[]
                           }
          }
          Enums: {
            "app_role": "admin"|"manager"|"staff"|"ctv"|"workshop","lead_status": "new"|"assigned"|"consulting"|"quoted"|"accepted"|"production"|"shipping"|"done"|"cancelled","production_step": "cho_san_xuat"|"dang_san_xuat"|"dang_in"|"dang_cat_cuon"|"dong_goi"|"da_san_xuat"|"san_sang_giao"|"da_giao"|"huy","quote_status": "draft"|"sent"|"accepted"|"changes_requested"|"expired"|"cancelled"
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
            "app_role": ["admin", "manager", "staff", "ctv", "workshop"],"lead_status": ["new", "assigned", "consulting", "quoted", "accepted", "production", "shipping", "done", "cancelled"],"production_step": ["cho_san_xuat", "dang_san_xuat", "dang_in", "dang_cat_cuon", "dong_goi", "da_san_xuat", "san_sang_giao", "da_giao", "huy"],"quote_status": ["draft", "sent", "accepted", "changes_requested", "expired", "cancelled"]
          }
        }
} as const
