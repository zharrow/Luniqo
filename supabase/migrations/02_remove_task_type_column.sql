-- ============================================================================
-- Remove task_type column from task_template
-- This column was added manually and is not in the schema
-- ============================================================================

-- Option 1: Drop the column completely
ALTER TABLE task_template DROP COLUMN IF EXISTS type;

-- Option 2: If you want to keep it but make it nullable, use this instead:
-- ALTER TABLE task_template ALTER COLUMN type DROP NOT NULL;
