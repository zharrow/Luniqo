-- ================================================
-- PHASE 1: CHILD TABLE ENHANCEMENTS
-- ================================================
-- Migration: 11_phase1_child_enhancements.sql
-- Description: Add administrative fields to child table
-- Changes: Add family_id, identity fields, dates, and replace section enum
-- ================================================

-- ============================================================
-- ALTER TABLE: child
-- ============================================================
-- Add new columns for complete child administrative profile
-- ============================================================

-- Add family relationship
ALTER TABLE child
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES family(id) ON DELETE SET NULL;

-- Add identity fields
ALTER TABLE child
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10),  -- 'male', 'female', 'other'
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS birth_place VARCHAR(255),
  ADD COLUMN IF NOT EXISTS social_security_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS caf_number VARCHAR(50);

-- Add important dates
ALTER TABLE child
  ADD COLUMN IF NOT EXISTS admission_date DATE,  -- Entry date to nursery
  ADD COLUMN IF NOT EXISTS exit_date DATE,  -- Exit date from nursery
  ADD COLUMN IF NOT EXISTS trial_period_end DATE;  -- End of adaptation period

-- Add practical information
ALTER TABLE child
  ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100),  -- Nickname/diminutive
  ADD COLUMN IF NOT EXISTS photo_url TEXT,  -- Main photo (Supabase Storage)
  ADD COLUMN IF NOT EXISTS notes TEXT;  -- Free notes

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_family ON child(family_id);
CREATE INDEX IF NOT EXISTS idx_child_admission ON child(admission_date);
CREATE INDEX IF NOT EXISTS idx_child_exit ON child(exit_date);

-- Add comments
COMMENT ON COLUMN child.family_id IS 'Link to family unit (optional)';
COMMENT ON COLUMN child.gender IS 'Gender: male, female, other';
COMMENT ON COLUMN child.nationality IS 'Nationality (default: France)';
COMMENT ON COLUMN child.social_security_number IS 'Social security number';
COMMENT ON COLUMN child.caf_number IS 'CAF number for this child';
COMMENT ON COLUMN child.admission_date IS 'Date child entered the nursery';
COMMENT ON COLUMN child.exit_date IS 'Date child left the nursery';
COMMENT ON COLUMN child.trial_period_end IS 'End of adaptation period';
COMMENT ON COLUMN child.preferred_name IS 'Nickname or diminutive';
COMMENT ON COLUMN child.photo_url IS 'Main profile photo URL';

-- ============================================================
-- DEPRECATE: section enum column
-- ============================================================
-- The old 'section' enum column will be replaced by the new
-- section table and child_section relationship in migration 12.
-- We keep it for now for backwards compatibility, but it should
-- no longer be used. The new system is more flexible.
-- ============================================================

COMMENT ON COLUMN child.section IS 'DEPRECATED: Use child_section table instead. Kept for backwards compatibility.';

-- ============================================================
-- END MIGRATION
-- ============================================================
