-- =====================================================
-- Migration 63: Fix HACCP Schema Mismatches
-- =====================================================
-- Description: Align database schema with haccp.service.ts expectations
-- Fixes errors:
--   - meal: missing allergens_present, wrong column names
--   - supplier: missing is_active
--   - temperature_check: wrong column names (measured_at vs control_date)
--   - equipment: wrong column names (category vs type)
--   - daily_cleaning_session: missing unique constraint for nursery_id + date
-- Date: 2026-01-21
-- =====================================================

-- ========================================
-- FIX 1: MEAL TABLE
-- ========================================
-- Service expects: type, menu, allergens_present, is_validated
-- Schema has: meal_type, description

-- Rename meal_type to type
ALTER TABLE meal RENAME COLUMN meal_type TO type;

-- Rename description to menu
ALTER TABLE meal RENAME COLUMN description TO menu;

-- Add allergens_present column
ALTER TABLE meal ADD COLUMN allergens_present TEXT;

-- Add is_validated column (default false for existing meals)
ALTER TABLE meal ADD COLUMN is_validated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN meal.allergens_present IS 'Allergens present in this meal (comma-separated)';
COMMENT ON COLUMN meal.is_validated IS 'Whether the meal has been validated by responsible';

-- ========================================
-- FIX 2: SUPPLIER TABLE
-- ========================================
-- Service expects: is_active
-- Schema has: haccp_certified, validation_date (no is_active)

-- Add is_active column (default true for existing suppliers)
ALTER TABLE supplier ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Set existing suppliers to active
UPDATE supplier SET is_active = TRUE WHERE is_active IS NULL;

-- Make NOT NULL after populating
ALTER TABLE supplier ALTER COLUMN is_active SET NOT NULL;

CREATE INDEX idx_supplier_is_active ON supplier(is_active);

COMMENT ON COLUMN supplier.is_active IS 'Whether the supplier is currently active';

-- ========================================
-- FIX 3: TEMPERATURE_CHECK TABLE
-- ========================================
-- Service expects: checkpoint_type, temperature_value, measured_at, measured_by_id, meal_id (nullable)
-- Schema has: checkpoint, temperature, control_date, responsible_id, meal_id (NOT NULL)

-- Rename checkpoint to checkpoint_type
ALTER TABLE temperature_check RENAME COLUMN checkpoint TO checkpoint_type;

-- Rename temperature to temperature_value
ALTER TABLE temperature_check RENAME COLUMN temperature TO temperature_value;

-- Rename control_date to measured_at
ALTER TABLE temperature_check RENAME COLUMN control_date TO measured_at;

-- Rename responsible_id to measured_by_id
ALTER TABLE temperature_check RENAME COLUMN responsible_id TO measured_by_id;

-- Make meal_id nullable (service expects it optional)
ALTER TABLE temperature_check ALTER COLUMN meal_id DROP NOT NULL;

-- Add notes column (service expects it)
ALTER TABLE temperature_check ADD COLUMN notes TEXT;

-- Add updated_at column (service expects it)
ALTER TABLE temperature_check ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index on measured_at for date range queries
CREATE INDEX idx_temperature_check_measured_at ON temperature_check(measured_at);

COMMENT ON COLUMN temperature_check.checkpoint_type IS 'Type of temperature checkpoint (Reception, Holding, Service, Storage)';
COMMENT ON COLUMN temperature_check.measured_at IS 'When the temperature was measured';

-- ========================================
-- FIX 4: EQUIPMENT TABLE
-- ========================================
-- Service expects: category, last_maintenance_date, next_maintenance_date, notes, is_active
-- Schema has: type, last_control_date, target_temperature, is_compliant, observations

-- Rename type to category
ALTER TABLE equipment RENAME COLUMN type TO category;

-- Rename last_control_date to last_maintenance_date
ALTER TABLE equipment RENAME COLUMN last_control_date TO last_maintenance_date;

-- Rename observations to notes
ALTER TABLE equipment RENAME COLUMN observations TO notes;

-- Add next_maintenance_date column
ALTER TABLE equipment ADD COLUMN next_maintenance_date DATE;

-- Add is_active column (keep is_compliant for compliance tracking)
ALTER TABLE equipment ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Set existing equipment to active
UPDATE equipment SET is_active = TRUE WHERE is_active IS NULL;

CREATE INDEX idx_equipment_is_active ON equipment(is_active);
CREATE INDEX idx_equipment_next_maintenance ON equipment(next_maintenance_date);

COMMENT ON COLUMN equipment.category IS 'Category/type of equipment';
COMMENT ON COLUMN equipment.last_maintenance_date IS 'Date of last maintenance';
COMMENT ON COLUMN equipment.next_maintenance_date IS 'Scheduled date for next maintenance';
COMMENT ON COLUMN equipment.is_active IS 'Whether the equipment is currently in use';

-- ========================================
-- FIX 5: DAILY_CLEANING_SESSION UNIQUE CONSTRAINT
-- ========================================
-- The error PGRST116 "The result contains 5 rows" suggests missing unique constraint
-- After migration 08, we use nursery_id but the unique was on (enterprise_id, date)
-- We need unique constraint on (nursery_id, date)

-- First, delete duplicate sessions keeping only the most recent one per nursery+date
DELETE FROM daily_cleaning_session dcs1
WHERE EXISTS (
    SELECT 1 FROM daily_cleaning_session dcs2
    WHERE dcs2.nursery_id = dcs1.nursery_id
    AND dcs2.date = dcs1.date
    AND dcs2.created_at > dcs1.created_at
);

-- Now add the unique constraint
ALTER TABLE daily_cleaning_session
ADD CONSTRAINT daily_cleaning_session_nursery_date_key UNIQUE (nursery_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_cleaning_session_nursery_date ON daily_cleaning_session(nursery_id, date);

COMMENT ON CONSTRAINT daily_cleaning_session_nursery_date_key ON daily_cleaning_session
IS 'Ensures only one session per nursery per day';

-- ========================================
-- SUMMARY
-- ========================================
-- ✅ meal: Renamed meal_type→type, description→menu, added allergens_present, is_validated
-- ✅ supplier: Added is_active column
-- ✅ temperature_check: Renamed checkpoint→checkpoint_type, temperature→temperature_value,
--                       control_date→measured_at, responsible_id→measured_by_id,
--                       made meal_id nullable, added notes & updated_at
-- ✅ equipment: Renamed type→category, last_control_date→last_maintenance_date,
--               observations→notes, added next_maintenance_date & is_active
-- ✅ daily_cleaning_session: Added unique constraint on (nursery_id, date)
