-- ============================================================================
-- Migration 67: Add contact info columns to enterprise table
-- ============================================================================
-- Adds address, city, postal_code, phone, email to enterprise for headquarters info

ALTER TABLE enterprise
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(150);

-- Add comment for documentation
COMMENT ON COLUMN enterprise.address IS 'Headquarters address';
COMMENT ON COLUMN enterprise.city IS 'Headquarters city';
COMMENT ON COLUMN enterprise.postal_code IS 'Headquarters postal code';
COMMENT ON COLUMN enterprise.phone IS 'Main contact phone number';
COMMENT ON COLUMN enterprise.email IS 'Main contact email address';
