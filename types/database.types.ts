// Database types generated from Supabase schema
// This file will be auto-generated once you run: npx supabase gen types typescript --local

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      super_admin: {
        Row: {
          id: string
          email: string
          password_hash: string
          firebase_uid: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          firebase_uid?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          firebase_uid?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin: {
        Row: {
          id: string
          email: string
          password_hash: string
          firebase_uid: string | null
          first_name: string
          last_name: string
          is_active: boolean
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          firebase_uid?: string | null
          first_name: string
          last_name: string
          is_active?: boolean
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          firebase_uid?: string | null
          first_name?: string
          last_name?: string
          is_active?: boolean
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      enterprise: {
        Row: {
          id: string
          admin_id: string
          name: string
          logo_url: string | null
          legal_form: string | null
          siret: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          name: string
          logo_url?: string | null
          legal_form?: string | null
          siret?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          name?: string
          logo_url?: string | null
          legal_form?: string | null
          siret?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employee: {
        Row: {
          id: string
          email: string | null
          first_name: string
          last_name: string
          pin_code: string
          enterprise_id: string
          is_active: boolean
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          first_name: string
          last_name: string
          pin_code: string
          enterprise_id: string
          is_active?: boolean
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string
          last_name?: string
          pin_code?: string
          enterprise_id?: string
          is_active?: boolean
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      session_status: 'EN_COURS' | 'COMPLETEE' | 'INCOMPLETE'
      log_status: 'FAIT' | 'PARTIEL' | 'REPORTE' | 'IMPOSSIBLE'
      meal_type: 'Breakfast' | 'Lunch' | 'Snack'
      checkpoint_type: 'Reception' | 'Holding' | 'Service' | 'Storage'
      section_type: 'Babies' | 'Toddlers' | 'Preschoolers'
      compliance_type: 'Product' | 'Temperature' | 'Hygiene' | 'Other'
      compliance_status: 'Open' | 'Corrected' | 'Closed'
      user_type: 'Developer' | 'Admin' | 'User' // Note: kept for backward compatibility, maps to super_admin/admin/employee
      message_status: 'Sent' | 'Delivered' | 'Read'
      notification_priority: 'Info' | 'Warning' | 'Critical'
      notification_status: 'Unread' | 'Read' | 'Archived'
      cleaning_frequency: 'Daily' | 'Weekly' | 'Monthly'
      document_category: 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'
    }
  }
}
