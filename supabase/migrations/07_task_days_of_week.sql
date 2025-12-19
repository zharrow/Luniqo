-- ============================================================================
-- Task Days of Week Feature
-- Allows specifying specific days for assigned tasks
-- Version: 1.0 (2025-12-19)
-- ============================================================================

-- The assigned_task.frequency field (JSONB) will store day-of-week scheduling
--
-- Format:
--
-- For tasks that repeat every day (default):
--   frequency = NULL
--
-- For tasks on specific days:
--   frequency = {
--     "type": "specific_days",
--     "days": ["Monday", "Tuesday", "Friday"]
--   }
--
-- Valid day names: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
-- (Crèche is closed on weekends)
--
-- Examples:
-- - Weekly floor cleaning (Friday only):
--   frequency = {"type": "specific_days", "days": ["Friday"]}
--
-- - Toy sanitizing (Monday, Wednesday, Friday):
--   frequency = {"type": "specific_days", "days": ["Monday", "Wednesday", "Friday"]}
--
-- - Daily diaper changing area cleaning:
--   frequency = NULL

-- No schema changes needed - frequency field already exists as JSONB
-- This migration documents the format for future reference

-- Add a comment to the column for documentation
COMMENT ON COLUMN assigned_task.frequency IS
'Task scheduling frequency. NULL = daily. Format: {"type": "specific_days", "days": ["Monday", "Wednesday", "Friday"]}';
