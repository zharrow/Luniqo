-- ============================================================================
-- DEVELOPMENT PERMISSIONS
-- WARNING: This is for DEVELOPMENT ONLY!
-- In production, create proper RLS policies instead.
-- ============================================================================

-- ============================================================================
-- DISABLE RLS FOR DEVELOPMENT
-- ============================================================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise DISABLE ROW LEVEL SECURITY;
ALTER TABLE room DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_room_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_template DISABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_task DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cleaning_session DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_completion DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_export DISABLE ROW LEVEL SECURITY;
ALTER TABLE child DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier DISABLE ROW LEVEL SECURITY;
ALTER TABLE product DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal DISABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_check DISABLE ROW LEVEL SECURITY;
ALTER TABLE child_meal_record DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE food_area_cleaning DISABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_incident DISABLE ROW LEVEL SECURITY;
ALTER TABLE document DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversation DISABLE ROW LEVEL SECURITY;
ALTER TABLE message DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT PERMISSIONS FOR SEEDING
-- ============================================================================

-- Grant permissions on all tables to authenticated and service roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;

-- Grant usage on all sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon;
