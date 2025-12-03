-- ============================================================================
-- Simplify session_status enum (remove INCOMPLETE)
-- ============================================================================
--
-- Rationale:
-- Sessions have only 2 meaningful states:
-- - EN_COURS: Session is active (automatically created for the day)
-- - COMPLETEE: Session is finished (all tasks completed)
--
-- The INCOMPLETE status is redundant as a session is either in progress or completed.

-- First, update any existing INCOMPLETE sessions to EN_COURS
UPDATE daily_cleaning_session
SET status = 'EN_COURS'
WHERE status = 'INCOMPLETE';

-- Step 1: Remove the default constraint
ALTER TABLE daily_cleaning_session
  ALTER COLUMN status DROP DEFAULT;

-- Step 2: Recreate the enum without INCOMPLETE
ALTER TYPE session_status RENAME TO session_status_old;
CREATE TYPE session_status AS ENUM ('EN_COURS', 'COMPLETEE');

-- Step 3: Update the column to use the new enum
ALTER TABLE daily_cleaning_session
  ALTER COLUMN status TYPE session_status
  USING status::text::session_status;

-- Step 4: Drop the old enum
DROP TYPE session_status_old;

-- Step 5: Re-add the default constraint
ALTER TABLE daily_cleaning_session
  ALTER COLUMN status SET DEFAULT 'EN_COURS';

COMMENT ON TYPE session_status IS 'Session status: EN_COURS (active) or COMPLETEE (finished)';
