-- =====================================================
-- Migration 68: Fix Product Table Schema
-- =====================================================
-- Description: Align product table with haccp.service.ts expectations
-- Problem: createProduct fails because service expects columns that don't exist
-- Service expects: shelf_life_days, storage_conditions, is_active
-- Schema has: stock_unit, current_stock, expiry_date (different columns)
-- Date: 2026-02-02
-- =====================================================

-- ========================================
-- FIX: PRODUCT TABLE
-- ========================================

-- Add shelf_life_days column (service expects integer)
ALTER TABLE product ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER;

-- Add storage_conditions column (service expects text)
ALTER TABLE product ADD COLUMN IF NOT EXISTS storage_conditions TEXT;

-- Add is_active column (service expects boolean, default true)
ALTER TABLE product ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Set existing products to active
UPDATE product SET is_active = TRUE WHERE is_active IS NULL;

-- Make is_active NOT NULL after populating
ALTER TABLE product ALTER COLUMN is_active SET NOT NULL;

-- Create index for active products filtering
CREATE INDEX IF NOT EXISTS idx_product_is_active ON product(is_active);

-- Add comments
COMMENT ON COLUMN product.shelf_life_days IS 'Number of days the product can be stored';
COMMENT ON COLUMN product.storage_conditions IS 'Required storage conditions (e.g., Refrigerated 4°C)';
COMMENT ON COLUMN product.is_active IS 'Whether the product is currently active';

-- ========================================
-- SUMMARY
-- ========================================
-- ✅ Added shelf_life_days (INTEGER, nullable)
-- ✅ Added storage_conditions (TEXT, nullable)
-- ✅ Added is_active (BOOLEAN, NOT NULL, default TRUE)
-- ✅ Created index on is_active for filtering
