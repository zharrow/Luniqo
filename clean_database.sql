-- ============================================================================
-- CLEAN DATABASE SCRIPT
-- WARNING: This will DELETE ALL DATA and TABLES
-- Run this in Supabase SQL Editor BEFORE applying 00_schema.sql
-- ============================================================================

-- Step 1: Delete all auth users first (important!)
-- Note: You may need to do this manually via Supabase Dashboard > Authentication > Users
-- Or uncomment and run this if you have the auth.admin role:
-- DELETE FROM auth.users;

-- Step 2: Drop all triggers on auth.users (if they exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_unique_username(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Step 4: Drop all tables in reverse dependency order
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS message CASCADE;
DROP TABLE IF EXISTS support_conversation CASCADE;
DROP TABLE IF EXISTS child_meal_record CASCADE;
DROP TABLE IF EXISTS document CASCADE;
DROP TABLE IF EXISTS haccp_incident CASCADE;
DROP TABLE IF EXISTS food_area_cleaning CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS batch CASCADE;
DROP TABLE IF EXISTS temperature_check CASCADE;
DROP TABLE IF EXISTS meal CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS supplier CASCADE;
DROP TABLE IF EXISTS child CASCADE;
DROP TABLE IF EXISTS session_export CASCADE;
DROP TABLE IF EXISTS task_completion CASCADE;
DROP TABLE IF EXISTS daily_cleaning_session CASCADE;
DROP TABLE IF EXISTS assigned_task CASCADE;
DROP TABLE IF EXISTS task_template CASCADE;
DROP TABLE IF EXISTS employee_room_access CASCADE;
DROP TABLE IF EXISTS room CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS owner CASCADE;
DROP TABLE IF EXISTS developer CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS enterprise CASCADE;

-- Step 5: Drop all custom types
DROP TYPE IF EXISTS document_category CASCADE;
DROP TYPE IF EXISTS cleaning_frequency CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS message_status CASCADE;
DROP TYPE IF EXISTS compliance_status CASCADE;
DROP TYPE IF EXISTS compliance_type CASCADE;
DROP TYPE IF EXISTS section_type CASCADE;
DROP TYPE IF EXISTS checkpoint_type CASCADE;
DROP TYPE IF EXISTS meal_type CASCADE;
DROP TYPE IF EXISTS log_status CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_type CASCADE;

-- Step 6: Verify cleanup
SELECT
    'Tables remaining' as check,
    count(*) as count
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT
    'Custom types remaining' as check,
    count(*) as count
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e';

-- Success message
SELECT '✅ Database cleaned! Now apply 00_schema.sql' as status;
