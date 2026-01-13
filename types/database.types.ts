// Database types for Luniqo - Unified Profiles Architecture
// Generated from Supabase schema (2025-12-07)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// User role enum
export type UserRole = 'Developer' | 'Owner' | 'Employee'

export interface Database {
  public: {
    Tables: {
      // ========================================================================
      // UNIFIED PROFILES TABLE (replaces developer, owner, employee)
      // ========================================================================
      profiles: {
        Row: {
          id: string
          role: UserRole
          email: string
          first_name: string | null
          last_name: string | null
          username: string | null        // Auto-generated for Employees (e.g., "Marie D")
          pin_hash: string | null        // bcrypt hashed PIN for tablet login (Employees only)
          enterprise_id: string | null   // For Employees
          primary_nursery_id: string | null  // Primary nursery for Employees (default location)
          created_by_id: string | null
          is_active: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string  // Must match auth.users.id
          role: UserRole
          email: string
          first_name?: string | null
          last_name?: string | null
          username?: string | null
          pin_hash?: string | null
          enterprise_id?: string | null
          primary_nursery_id?: string | null
          created_by_id?: string | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          email?: string
          first_name?: string | null
          last_name?: string | null
          username?: string | null
          pin_hash?: string | null
          enterprise_id?: string | null
          primary_nursery_id?: string | null
          created_by_id?: string | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // ========================================================================
      // ENTERPRISE TABLE
      // ========================================================================
      enterprise: {
        Row: {
          id: string
          owner_id: string | null  // References profiles.id where role='Owner'
          name: string
          logo_url: string | null
          legal_form: string | null
          siret: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          logo_url?: string | null
          legal_form?: string | null
          siret?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          name?: string
          logo_url?: string | null
          legal_form?: string | null
          siret?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // ========================================================================
      // NURSERY TABLE (Multi-Site Architecture)
      // ========================================================================
      nursery: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          address: string | null
          city: string | null
          postal_code: string | null
          phone: string | null
          email: string | null
          capacity: number | null  // Maximum number of children
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          address?: string | null
          city?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          capacity?: number | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          address?: string | null
          city?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          capacity?: number | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // ========================================================================
      // EMPLOYEE-NURSERY ACCESS (Multi-Site Employee Assignment)
      // ========================================================================
      employee_nursery_access: {
        Row: {
          id: string
          employee_id: string  // References profiles.id where role='Employee'
          nursery_id: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          nursery_id: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          nursery_id?: string
          created_at?: string
        }
      }
      // ========================================================================
      // LUNIQO MODULE TABLES
      // ========================================================================
      room: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          description: string | null
          display_order: number | null
          image_key: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          description?: string | null
          display_order?: number | null
          image_key?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          description?: string | null
          display_order?: number | null
          image_key?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      employee_room_access: {
        Row: {
          id: string
          employee_id: string  // References profiles.id where role='Employee'
          room_id: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          room_id: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          room_id?: string
          created_at?: string
        }
      }
      task_category: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          color: string
          icon: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          color?: string
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          color?: string
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      task_template: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          description: string | null
          estimated_duration: number | null
          category_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          description?: string | null
          estimated_duration?: number | null
          category_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          description?: string | null
          estimated_duration?: number | null
          category_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      assigned_task: {
        Row: {
          id: string
          room_id: string | null
          task_template_id: string | null
          default_performer_id: string | null  // References profiles.id
          frequency: Json | null
          suggested_time: string | null
          expected_duration: number | null
          order_in_room: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id?: string | null
          task_template_id?: string | null
          default_performer_id?: string | null
          frequency?: Json | null
          suggested_time?: string | null
          expected_duration?: number | null
          order_in_room?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string | null
          task_template_id?: string | null
          default_performer_id?: string | null
          frequency?: Json | null
          suggested_time?: string | null
          expected_duration?: number | null
          order_in_room?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      daily_cleaning_session: {
        Row: {
          id: string
          enterprise_id: string
          date: string
          status: 'EN_COURS' | 'COMPLETEE'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          date: string
          status?: 'EN_COURS' | 'COMPLETEE'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          date?: string
          status?: 'EN_COURS' | 'COMPLETEE'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_completion: {
        Row: {
          id: string
          session_id: string | null
          assigned_task_id: string | null
          performed_by_id: string | null  // References profiles.id
          recorded_by_id: string | null   // References profiles.id
          status: 'FAIT' | 'PARTIEL' | 'REPORTE' | 'IMPOSSIBLE'
          note: string | null
          photo_urls: Json | null
          performed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          assigned_task_id?: string | null
          performed_by_id?: string | null
          recorded_by_id?: string | null
          status: 'FAIT' | 'PARTIEL' | 'REPORTE' | 'IMPOSSIBLE'
          note?: string | null
          photo_urls?: Json | null
          performed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          assigned_task_id?: string | null
          performed_by_id?: string | null
          recorded_by_id?: string | null
          status?: 'FAIT' | 'PARTIEL' | 'REPORTE' | 'IMPOSSIBLE'
          note?: string | null
          photo_urls?: Json | null
          performed_at?: string | null
          created_at?: string
        }
      }
      session_export: {
        Row: {
          id: string
          session_id: string | null
          pdf_url: string | null
          zip_url: string | null
          exported_at: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          pdf_url?: string | null
          zip_url?: string | null
          exported_at: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          pdf_url?: string | null
          zip_url?: string | null
          exported_at?: string
          created_at?: string
        }
      }
      // ========================================================================
      // HACCP MODULE TABLES
      // ========================================================================
      child: {
        Row: {
          id: string
          enterprise_id: string
          last_name: string
          first_name: string
          birth_date: string
          section: 'Babies' | 'Toddlers' | 'Preschoolers'
          allergies: string | null
          specific_diet: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          last_name: string
          first_name: string
          birth_date: string
          section: 'Babies' | 'Toddlers' | 'Preschoolers'
          allergies?: string | null
          specific_diet?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          last_name?: string
          first_name?: string
          birth_date?: string
          section?: 'Babies' | 'Toddlers' | 'Preschoolers'
          allergies?: string | null
          specific_diet?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      supplier: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          contact_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          haccp_certified: boolean
          validation_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          haccp_certified?: boolean
          validation_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          haccp_certified?: boolean
          validation_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      product: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          category: string | null
          allergens: string | null
          stock_unit: string | null
          current_stock: number | null
          expiry_date: string | null
          supplier_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          category?: string | null
          allergens?: string | null
          stock_unit?: string | null
          current_stock?: number | null
          expiry_date?: string | null
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          category?: string | null
          allergens?: string | null
          stock_unit?: string | null
          current_stock?: number | null
          expiry_date?: string | null
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      batch: {
        Row: {
          id: string
          product_id: string
          batch_code: string
          reception_date: string
          received_quantity: number | null
          reception_temperature: number | null
          is_compliant: boolean
          observations: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          batch_code: string
          reception_date: string
          received_quantity?: number | null
          reception_temperature?: number | null
          is_compliant?: boolean
          observations?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          batch_code?: string
          reception_date?: string
          received_quantity?: number | null
          reception_temperature?: number | null
          is_compliant?: boolean
          observations?: string | null
          created_at?: string
        }
      }
      meal: {
        Row: {
          id: string
          enterprise_id: string
          date: string
          meal_type: 'Breakfast' | 'Lunch' | 'Snack'
          description: string | null
          supplier_id: string | null
          batch_id: string | null
          responsible_id: string | null  // References profiles.id
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          date: string
          meal_type: 'Breakfast' | 'Lunch' | 'Snack'
          description?: string | null
          supplier_id?: string | null
          batch_id?: string | null
          responsible_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          date?: string
          meal_type?: 'Breakfast' | 'Lunch' | 'Snack'
          description?: string | null
          supplier_id?: string | null
          batch_id?: string | null
          responsible_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      temperature_check: {
        Row: {
          id: string
          meal_id: string
          checkpoint: 'Reception' | 'Holding' | 'Service' | 'Storage'
          temperature: number
          is_compliant: boolean
          observations: string | null
          control_date: string
          responsible_id: string | null  // References profiles.id
          created_at: string
        }
        Insert: {
          id?: string
          meal_id: string
          checkpoint: 'Reception' | 'Holding' | 'Service' | 'Storage'
          temperature: number
          is_compliant?: boolean
          observations?: string | null
          control_date: string
          responsible_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meal_id?: string
          checkpoint?: 'Reception' | 'Holding' | 'Service' | 'Storage'
          temperature?: number
          is_compliant?: boolean
          observations?: string | null
          control_date?: string
          responsible_id?: string | null
          created_at?: string
        }
      }
      child_meal_record: {
        Row: {
          id: string
          meal_id: string
          child_id: string
          portion: string | null
          observations: string | null
          created_at: string
        }
        Insert: {
          id?: string
          meal_id: string
          child_id: string
          portion?: string | null
          observations?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meal_id?: string
          child_id?: string
          portion?: string | null
          observations?: string | null
          created_at?: string
        }
      }
      equipment: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          type: string | null
          last_control_date: string | null
          target_temperature: number | null
          is_compliant: boolean
          observations: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          type?: string | null
          last_control_date?: string | null
          target_temperature?: number | null
          is_compliant?: boolean
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          type?: string | null
          last_control_date?: string | null
          target_temperature?: number | null
          is_compliant?: boolean
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      food_area_cleaning: {
        Row: {
          id: string
          enterprise_id: string
          zone: string
          product_used: string | null
          frequency: 'Daily' | 'Weekly' | 'Monthly'
          cleaning_date: string
          responsible_id: string | null  // References profiles.id
          observations: string | null
          created_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          zone: string
          product_used?: string | null
          frequency: 'Daily' | 'Weekly' | 'Monthly'
          cleaning_date: string
          responsible_id?: string | null
          observations?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          zone?: string
          product_used?: string | null
          frequency?: 'Daily' | 'Weekly' | 'Monthly'
          cleaning_date?: string
          responsible_id?: string | null
          observations?: string | null
          created_at?: string
        }
      }
      haccp_incident: {
        Row: {
          id: string
          enterprise_id: string
          type: 'Product' | 'Temperature' | 'Hygiene' | 'Other'
          description: string
          report_date: string
          corrective_action: string | null
          status: 'Open' | 'Corrected' | 'Closed'
          responsible_id: string | null  // References profiles.id
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          type: 'Product' | 'Temperature' | 'Hygiene' | 'Other'
          description: string
          report_date: string
          corrective_action?: string | null
          status?: 'Open' | 'Corrected' | 'Closed'
          responsible_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          type?: 'Product' | 'Temperature' | 'Hygiene' | 'Other'
          description?: string
          report_date?: string
          corrective_action?: string | null
          status?: 'Open' | 'Corrected' | 'Closed'
          responsible_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      document: {
        Row: {
          id: string
          enterprise_id: string
          name: string
          category: 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'
          file_path: string
          creation_date: string
          retention_period: string | null
          responsible_id: string | null  // References profiles.id
          created_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          name: string
          category: 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'
          file_path: string
          creation_date: string
          retention_period?: string | null
          responsible_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          name?: string
          category?: 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'
          file_path?: string
          creation_date?: string
          retention_period?: string | null
          responsible_id?: string | null
          created_at?: string
        }
      }
      // ========================================================================
      // COMMUNICATION MODULE TABLES
      // ========================================================================
      support_conversation: {
        Row: {
          id: string
          owner_id: string   // References profiles.id where role='Owner'
          developer_id: string  // References profiles.id where role='Developer'
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          developer_id: string
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          developer_id?: string
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      message: {
        Row: {
          id: string
          conversation_id: string
          sender_type: UserRole
          sender_id: string
          recipient_type: UserRole
          recipient_id: string
          content: string
          status: 'Sent' | 'Delivered' | 'Read'
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_type: UserRole
          sender_id: string
          recipient_type: UserRole
          recipient_id: string
          content: string
          status?: 'Sent' | 'Delivered' | 'Read'
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_type?: UserRole
          sender_id?: string
          recipient_type?: UserRole
          recipient_id?: string
          content?: string
          status?: 'Sent' | 'Delivered' | 'Read'
          created_at?: string
          read_at?: string | null
        }
      }
      notification: {
        Row: {
          id: string
          enterprise_id: string | null
          recipient_type: UserRole
          recipient_id: string | null
          title: string
          content: string
          type: string | null
          priority: 'Info' | 'Warning' | 'Critical'
          status: 'Unread' | 'Read' | 'Archived'
          resource_type: string | null
          resource_id: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          enterprise_id?: string | null
          recipient_type: UserRole
          recipient_id?: string | null
          title: string
          content: string
          type?: string | null
          priority?: 'Info' | 'Warning' | 'Critical'
          status?: 'Unread' | 'Read' | 'Archived'
          resource_type?: string | null
          resource_id?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          enterprise_id?: string | null
          recipient_type?: UserRole
          recipient_id?: string | null
          title?: string
          content?: string
          type?: string | null
          priority?: 'Info' | 'Warning' | 'Critical'
          status?: 'Unread' | 'Read' | 'Archived'
          resource_type?: string | null
          resource_id?: string | null
          created_at?: string
          read_at?: string | null
        }
      }

      // ========================================================================
      // MODULE PERMISSIONS SYSTEM
      // ========================================================================
      module: {
        Row: {
          id: string
          name: string
          description: string
          category: string | null
          price_monthly: number
          icon_name: string | null
          is_free: boolean
          is_active: boolean
          display_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description: string
          category?: string | null
          price_monthly: number
          icon_name?: string | null
          is_free?: boolean
          is_active?: boolean
          display_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string | null
          price_monthly?: number
          icon_name?: string | null
          is_free?: boolean
          is_active?: boolean
          display_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      enterprise_module_access: {
        Row: {
          id: string
          enterprise_id: string
          module_id: string
          granted_at: string
          granted_by_id: string | null
          expires_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          enterprise_id: string
          module_id: string
          granted_at?: string
          granted_by_id?: string | null
          expires_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          enterprise_id?: string
          module_id?: string
          granted_at?: string
          granted_by_id?: string | null
          expires_at?: string | null
          is_active?: boolean
        }
      }
      module_access_request: {
        Row: {
          id: string
          enterprise_id: string
          module_id: string
          owner_id: string
          status: 'pending' | 'approved' | 'rejected'
          message: string | null
          reviewed_by_id: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          module_id: string
          owner_id: string
          status?: 'pending' | 'approved' | 'rejected'
          message?: string | null
          reviewed_by_id?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          module_id?: string
          owner_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          message?: string | null
          reviewed_by_id?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_username: {
        Args: { p_first_name: string; p_last_name: string }
        Returns: string
      }
    }
    Enums: {
      user_role: 'Developer' | 'Owner' | 'Employee'
      session_status: 'EN_COURS' | 'COMPLETEE'
      log_status: 'FAIT' | 'PARTIEL' | 'REPORTE' | 'IMPOSSIBLE'
      meal_type: 'Breakfast' | 'Lunch' | 'Snack'
      checkpoint_type: 'Reception' | 'Holding' | 'Service' | 'Storage'
      section_type: 'Babies' | 'Toddlers' | 'Preschoolers'
      compliance_type: 'Product' | 'Temperature' | 'Hygiene' | 'Other'
      compliance_status: 'Open' | 'Corrected' | 'Closed'
      message_status: 'Sent' | 'Delivered' | 'Read'
      notification_priority: 'Info' | 'Warning' | 'Critical'
      notification_status: 'Unread' | 'Read' | 'Archived'
      cleaning_frequency: 'Daily' | 'Weekly' | 'Monthly'
      document_category: 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'
    }
  }
}

// ============================================================================
// CONVENIENCE TYPE ALIASES
// ============================================================================

// Profile type (unified user)
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// Enterprise type
export type Enterprise = Database['public']['Tables']['enterprise']['Row']
export type EnterpriseInsert = Database['public']['Tables']['enterprise']['Insert']
export type EnterpriseUpdate = Database['public']['Tables']['enterprise']['Update']

// Nursery type (Multi-Site)
export type Nursery = Database['public']['Tables']['nursery']['Row']
export type NurseryInsert = Database['public']['Tables']['nursery']['Insert']
export type NurseryUpdate = Database['public']['Tables']['nursery']['Update']

// Employee-Nursery Access type (Multi-Site)
export type EmployeeNurseryAccess = Database['public']['Tables']['employee_nursery_access']['Row']
export type EmployeeNurseryAccessInsert = Database['public']['Tables']['employee_nursery_access']['Insert']
export type EmployeeNurseryAccessUpdate = Database['public']['Tables']['employee_nursery_access']['Update']

// Room type
export type Room = Database['public']['Tables']['room']['Row']

// Task types
export type TaskTemplate = Database['public']['Tables']['task_template']['Row']
export type AssignedTask = Database['public']['Tables']['assigned_task']['Row']
export type TaskCompletion = Database['public']['Tables']['task_completion']['Row']
export type DailyCleaningSession = Database['public']['Tables']['daily_cleaning_session']['Row']

// HACCP types
export type Child = Database['public']['Tables']['child']['Row']
export type Supplier = Database['public']['Tables']['supplier']['Row']
export type Product = Database['public']['Tables']['product']['Row']
export type Meal = Database['public']['Tables']['meal']['Row']
export type TemperatureCheck = Database['public']['Tables']['temperature_check']['Row']
export type Equipment = Database['public']['Tables']['equipment']['Row']
export type HaccpIncident = Database['public']['Tables']['haccp_incident']['Row']
export type Document = Database['public']['Tables']['document']['Row']

// Communication types
export type SupportConversation = Database['public']['Tables']['support_conversation']['Row']
export type Message = Database['public']['Tables']['message']['Row']
export type Notification = Database['public']['Tables']['notification']['Row']

// Module Permissions types
export type Module = Database['public']['Tables']['module']['Row']
export type ModuleInsert = Database['public']['Tables']['module']['Insert']
export type ModuleUpdate = Database['public']['Tables']['module']['Update']

export type EnterpriseModuleAccess = Database['public']['Tables']['enterprise_module_access']['Row']
export type EnterpriseModuleAccessInsert = Database['public']['Tables']['enterprise_module_access']['Insert']
export type EnterpriseModuleAccessUpdate = Database['public']['Tables']['enterprise_module_access']['Update']

export type ModuleAccessRequest = Database['public']['Tables']['module_access_request']['Row']
export type ModuleAccessRequestInsert = Database['public']['Tables']['module_access_request']['Insert']
export type ModuleAccessRequestUpdate = Database['public']['Tables']['module_access_request']['Update']
