-- =====================================================
-- Migration 63 (SAFE): Fix HACCP Schema Mismatches
-- =====================================================
-- Version robuste qui vérifie l'existence des colonnes avant modification

-- ========================================
-- FIX 1: MEAL TABLE
-- ========================================
-- Add columns if they don't exist (safer than renaming)

-- Add type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal' AND column_name = 'type') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal' AND column_name = 'meal_type') THEN
      ALTER TABLE meal RENAME COLUMN meal_type TO type;
    ELSE
      ALTER TABLE meal ADD COLUMN type VARCHAR(50);
    END IF;
  END IF;
END $$;

-- Add menu column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal' AND column_name = 'menu') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal' AND column_name = 'description') THEN
      ALTER TABLE meal RENAME COLUMN description TO menu;
    ELSE
      ALTER TABLE meal ADD COLUMN menu TEXT;
    END IF;
  END IF;
END $$;

-- Add allergens_present if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal' AND column_name = 'allergens_present') THEN
    ALTER TABLE meal ADD COLUMN allergens_present TEXT;
  END IF;
END $$;

-- Add is_validated if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal' AND column_name = 'is_validated') THEN
    ALTER TABLE meal ADD COLUMN is_validated BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ========================================
-- FIX 2: SUPPLIER TABLE
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier' AND column_name = 'is_active') THEN
    ALTER TABLE supplier ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    UPDATE supplier SET is_active = TRUE WHERE is_active IS NULL;
    ALTER TABLE supplier ALTER COLUMN is_active SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplier_is_active ON supplier(is_active);

-- ========================================
-- FIX 3: TEMPERATURE_CHECK TABLE
-- ========================================
DO $$
BEGIN
  -- checkpoint -> checkpoint_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'checkpoint_type') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'checkpoint') THEN
      ALTER TABLE temperature_check RENAME COLUMN checkpoint TO checkpoint_type;
    ELSE
      ALTER TABLE temperature_check ADD COLUMN checkpoint_type VARCHAR(50);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- temperature -> temperature_value
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'temperature_value') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'temperature') THEN
      ALTER TABLE temperature_check RENAME COLUMN temperature TO temperature_value;
    ELSE
      ALTER TABLE temperature_check ADD COLUMN temperature_value DECIMAL(5,2);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- control_date -> measured_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'measured_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'control_date') THEN
      ALTER TABLE temperature_check RENAME COLUMN control_date TO measured_at;
    ELSE
      ALTER TABLE temperature_check ADD COLUMN measured_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- responsible_id -> measured_by_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'measured_by_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'responsible_id') THEN
      ALTER TABLE temperature_check RENAME COLUMN responsible_id TO measured_by_id;
    ELSE
      ALTER TABLE temperature_check ADD COLUMN measured_by_id UUID REFERENCES profiles(id);
    END IF;
  END IF;
END $$;

-- Make meal_id nullable if it exists and is NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temperature_check'
    AND column_name = 'meal_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE temperature_check ALTER COLUMN meal_id DROP NOT NULL;
  END IF;
END $$;

-- Add notes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'notes') THEN
    ALTER TABLE temperature_check ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'updated_at') THEN
    ALTER TABLE temperature_check ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_temperature_check_measured_at ON temperature_check(measured_at);

-- ========================================
-- FIX 4: EQUIPMENT TABLE
-- ========================================
DO $$
BEGIN
  -- type -> category
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'category') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'type') THEN
      ALTER TABLE equipment RENAME COLUMN type TO category;
    ELSE
      ALTER TABLE equipment ADD COLUMN category VARCHAR(100);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- last_control_date -> last_maintenance_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'last_maintenance_date') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'last_control_date') THEN
      ALTER TABLE equipment RENAME COLUMN last_control_date TO last_maintenance_date;
    ELSE
      ALTER TABLE equipment ADD COLUMN last_maintenance_date DATE;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- observations -> notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'observations') THEN
      ALTER TABLE equipment RENAME COLUMN observations TO notes;
    ELSE
      ALTER TABLE equipment ADD COLUMN notes TEXT;
    END IF;
  END IF;
END $$;

-- Add next_maintenance_date if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'next_maintenance_date') THEN
    ALTER TABLE equipment ADD COLUMN next_maintenance_date DATE;
  END IF;
END $$;

-- Add is_active if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'is_active') THEN
    ALTER TABLE equipment ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    UPDATE equipment SET is_active = TRUE WHERE is_active IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_is_active ON equipment(is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance ON equipment(next_maintenance_date);

-- ========================================
-- FIX 5: DAILY_CLEANING_SESSION UNIQUE CONSTRAINT
-- ========================================
-- First, delete duplicate sessions keeping only the most recent one per nursery+date
DELETE FROM daily_cleaning_session dcs1
WHERE EXISTS (
    SELECT 1 FROM daily_cleaning_session dcs2
    WHERE dcs2.nursery_id = dcs1.nursery_id
    AND dcs2.date = dcs1.date
    AND dcs2.created_at > dcs1.created_at
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_cleaning_session_nursery_date_key'
  ) THEN
    ALTER TABLE daily_cleaning_session
    ADD CONSTRAINT daily_cleaning_session_nursery_date_key UNIQUE (nursery_id, date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_cleaning_session_nursery_date ON daily_cleaning_session(nursery_id, date);

-- ========================================
-- SUMMARY
-- ========================================
-- ✅ All modifications are now safe and idempotent
-- ✅ Checks column existence before renaming/adding
-- ✅ Can be run multiple times without errors
