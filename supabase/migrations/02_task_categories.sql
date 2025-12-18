-- ============================================================================
-- Add task_category table for better data consistency
-- Migration: 02_task_categories.sql
-- Date: 2025-12-18
-- ============================================================================

-- Create task_category table
CREATE TABLE task_category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#84cc16', -- Lime color as default
    icon VARCHAR(50), -- Optional icon name (e.g., 'mop', 'spray-can', 'trash')
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique category names per enterprise
    UNIQUE(enterprise_id, name)
);

-- Create index for faster lookups
CREATE INDEX idx_task_category_enterprise ON task_category(enterprise_id);
CREATE INDEX idx_task_category_active ON task_category(enterprise_id, is_active);

-- Migrate existing categories from task_template
-- This creates one category per unique (enterprise_id, category) combination
INSERT INTO task_category (enterprise_id, name)
SELECT DISTINCT
    enterprise_id,
    category
FROM task_template
WHERE category IS NOT NULL
  AND category != ''
  AND category NOT IN (SELECT name FROM task_category WHERE task_category.enterprise_id = task_template.enterprise_id);

-- Add category_id column to task_template
ALTER TABLE task_template
ADD COLUMN category_id UUID REFERENCES task_category(id) ON DELETE SET NULL;

-- Migrate data: link existing tasks to their categories
UPDATE task_template
SET category_id = (
    SELECT tc.id
    FROM task_category tc
    WHERE tc.enterprise_id = task_template.enterprise_id
      AND tc.name = task_template.category
)
WHERE category IS NOT NULL AND category != '';

-- Drop the old category column (now replaced by category_id FK)
ALTER TABLE task_template DROP COLUMN category;

-- Create index for faster lookups
CREATE INDEX idx_task_template_category ON task_template(category_id);

-- Add comment for documentation
COMMENT ON TABLE task_category IS 'Task categories for organizing cleaning tasks. Each enterprise has their own categories.';
COMMENT ON COLUMN task_category.color IS 'Hex color code for UI display (e.g., #84cc16 for lime green)';
COMMENT ON COLUMN task_category.icon IS 'Optional icon identifier for UI display';
