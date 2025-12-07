-- ============================================================================
-- FIX FOR handle_new_user() TRIGGER FUNCTION
-- Run this in Supabase SQL Editor to replace the broken function
-- ============================================================================

-- Drop and recreate the function with proper NULL handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_enterprise_id UUID;
    v_created_by_id UUID;
BEGIN
    -- Safely extract UUID fields (handle NULL and empty strings)
    BEGIN
        v_enterprise_id := NULLIF(NEW.raw_user_meta_data->>'enterprise_id', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_enterprise_id := NULL;
    END;

    BEGIN
        v_created_by_id := NULLIF(NEW.raw_user_meta_data->>'created_by_id', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_created_by_id := NULL;
    END;

    -- Insert profile with safe NULL handling
    INSERT INTO public.profiles (id, role, email, first_name, last_name, enterprise_id, created_by_id)
    VALUES (
        NEW.id,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_type, 'Owner'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        v_enterprise_id,
        v_created_by_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was created
SELECT 'Trigger function updated successfully!' as status;
