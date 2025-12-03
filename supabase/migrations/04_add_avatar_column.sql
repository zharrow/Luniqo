-- ============================================================================
-- Migration: Add avatar column to admin and employee tables
-- Date: 2025-12-03
-- Description: Add avatar field to allow users to select profile pictures
-- ============================================================================

-- Add avatar column to admin table
ALTER TABLE admin
ADD COLUMN avatar VARCHAR(255);

-- Add comment
COMMENT ON COLUMN admin.avatar IS 'Avatar filename (e.g., men.jpg, women.jpg)';

-- Add avatar column to employee table
ALTER TABLE employee
ADD COLUMN avatar VARCHAR(255);

-- Add comment
COMMENT ON COLUMN employee.avatar IS 'Avatar filename (e.g., men.jpg, women.jpg)';
