-- ============================================================================
-- Table Renaming Migration
-- Refactor table names for better clarity and consistency
-- ============================================================================

-- ============================================================================
-- 1. RENAME TABLES
-- ============================================================================

-- User System Tables
ALTER TABLE developer RENAME TO super_admin;
ALTER TABLE "user" RENAME TO employee;
ALTER TABLE user_rooms RENAME TO employee_room_access;

-- cLean Module Tables
ALTER TABLE cleaning_session RENAME TO daily_cleaning_session;
ALTER TABLE cleaning_log RENAME TO task_completion;
ALTER TABLE export RENAME TO session_export;

-- HACCP Module Tables
ALTER TABLE cleaning_haccp RENAME TO food_area_cleaning;
ALTER TABLE non_compliance RENAME TO haccp_incident;
ALTER TABLE temperature RENAME TO temperature_check;
ALTER TABLE meal_children RENAME TO child_meal_record;

-- Communication Module Tables
ALTER TABLE conversation RENAME TO support_conversation;

-- ============================================================================
-- 2. RENAME INDEXES
-- ============================================================================

-- User system indexes
ALTER INDEX idx_admin_firebase_uid RENAME TO idx_admin_supabase_auth_uid;
ALTER INDEX idx_developer_firebase_uid RENAME TO idx_super_admin_supabase_auth_uid;
ALTER INDEX idx_enterprise_admin_id RENAME TO idx_enterprise_admin_id;
ALTER INDEX idx_user_enterprise_id RENAME TO idx_employee_enterprise_id;
ALTER INDEX idx_user_rooms_user_id RENAME TO idx_employee_room_access_employee_id;
ALTER INDEX idx_user_rooms_room_id RENAME TO idx_employee_room_access_room_id;

-- cLean module indexes
ALTER INDEX idx_cleaning_session_enterprise_date RENAME TO idx_daily_cleaning_session_enterprise_date;
ALTER INDEX idx_cleaning_log_session_id RENAME TO idx_task_completion_session_id;
ALTER INDEX idx_cleaning_log_performed_by RENAME TO idx_task_completion_performed_by;

-- HACCP module indexes
ALTER INDEX idx_cleaning_haccp_enterprise_id RENAME TO idx_food_area_cleaning_enterprise_id;
ALTER INDEX idx_non_compliance_enterprise_id RENAME TO idx_haccp_incident_enterprise_id;
ALTER INDEX idx_temperature_meal_id RENAME TO idx_temperature_check_meal_id;

-- Communication module indexes
ALTER INDEX idx_conversation_admin_id RENAME TO idx_support_conversation_admin_id;
ALTER INDEX idx_conversation_developer_id RENAME TO idx_support_conversation_super_admin_id;

-- ============================================================================
-- 3. RENAME TRIGGERS
-- ============================================================================

-- User system triggers
ALTER TRIGGER update_developer_updated_at ON super_admin RENAME TO update_super_admin_updated_at;
ALTER TRIGGER update_user_updated_at ON employee RENAME TO update_employee_updated_at;

-- cLean module triggers
ALTER TRIGGER update_cleaning_session_updated_at ON daily_cleaning_session RENAME TO update_daily_cleaning_session_updated_at;

-- Communication module triggers
ALTER TRIGGER update_conversation_updated_at ON support_conversation RENAME TO update_support_conversation_updated_at;

-- ============================================================================
-- 4. UPDATE COMMENTS
-- ============================================================================

COMMENT ON TABLE super_admin IS 'Platform super admin with analytics view only (Supabase Auth)';
COMMENT ON TABLE employee IS 'Childcare employee/staff with tablet access (PIN authentication)';
COMMENT ON TABLE employee_room_access IS 'Many-to-many: employees can access multiple rooms';
COMMENT ON TABLE daily_cleaning_session IS 'Daily cleaning session (1 per enterprise per day)';
COMMENT ON TABLE task_completion IS 'Permanent record of completed tasks';
COMMENT ON TABLE session_export IS 'Export records for cleaning sessions (PDF/ZIP)';
COMMENT ON TABLE food_area_cleaning IS 'HACCP-compliant cleaning records for food preparation areas';
COMMENT ON TABLE haccp_incident IS 'HACCP non-compliance incidents and corrective actions';
COMMENT ON TABLE temperature_check IS 'Temperature checkpoints for meal safety';
COMMENT ON TABLE child_meal_record IS 'Records of children attendance at meals';
COMMENT ON TABLE support_conversation IS 'Admin ↔ Super Admin support messaging threads';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all tables were renamed successfully:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
