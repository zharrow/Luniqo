-- ============================================================================
-- Remove redundant default_duration column from task_template
-- ============================================================================
--
-- Rationale:
-- The task_template table had both default_duration and estimated_duration,
-- which are redundant. We keep only estimated_duration as the template's
-- default duration. The assigned_task.expected_duration stores the specific
-- duration for each room assignment.

ALTER TABLE task_template DROP COLUMN IF EXISTS default_duration;

COMMENT ON COLUMN task_template.estimated_duration IS 'Default estimated duration in minutes for this task template';
