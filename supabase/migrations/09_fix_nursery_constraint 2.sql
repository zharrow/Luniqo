-- =====================================================
-- Migration 09: Fix nursery unique constraint
-- =====================================================
-- Description: Replace UNIQUE constraint with partial index
--              to allow multiple non-default nurseries per enterprise
-- Date: 2025-12-22
-- =====================================================

-- Drop the incorrect unique constraint
ALTER TABLE nursery DROP CONSTRAINT IF EXISTS unique_default_per_enterprise;

-- Create a partial unique index that only applies when is_default = TRUE
-- This allows:
-- - Only ONE nursery with is_default = true per enterprise
-- - MULTIPLE nurseries with is_default = false per enterprise
CREATE UNIQUE INDEX unique_default_per_enterprise
  ON nursery (enterprise_id)
  WHERE is_default = true;

COMMENT ON INDEX unique_default_per_enterprise IS 'Ensures only one default nursery per enterprise (partial index)';
