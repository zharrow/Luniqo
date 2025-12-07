-- ============================================================================
-- DIAGNOSTIC SCRIPT - Check Luniqo Database State
-- Run this in Supabase SQL Editor to verify database setup
-- ============================================================================

-- 1. Check if profiles table exists
SELECT
    'profiles table exists' as check_name,
    EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
    ) as result;

-- 2. Check if enterprise table exists
SELECT
    'enterprise table exists' as check_name,
    EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'enterprise'
    ) as result;

-- 3. Check if user_role enum exists
SELECT
    'user_role enum exists' as check_name,
    EXISTS (
        SELECT FROM pg_type
        WHERE typname = 'user_role'
    ) as result;

-- 4. Check if handle_new_user function exists
SELECT
    'handle_new_user function exists' as check_name,
    EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'handle_new_user'
    ) as result;

-- 5. Check if trigger on auth.users exists
SELECT
    'on_auth_user_created trigger exists' as check_name,
    EXISTS (
        SELECT FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth'
        AND c.relname = 'users'
        AND t.tgname = 'on_auth_user_created'
    ) as result;

-- 6. List all tables in public schema
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 7. Check profiles table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 8. List all custom types
SELECT
    typname as enum_name,
    array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY typname
ORDER BY typname;
