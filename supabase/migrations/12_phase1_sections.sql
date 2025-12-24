-- ================================================
-- PHASE 1: SECTIONS (AGE GROUPS)
-- ================================================
-- Migration: 12_phase1_sections.sql
-- Description: Create section and child_section tables for age group management
-- Tables: section, child_section
-- ================================================

-- ============================================================
-- TABLE: section
-- ============================================================
-- Represents age groups/sections in a nursery (Bébés, Moyens, Grands)
-- Each nursery can define its own sections
-- ============================================================

CREATE TABLE section (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,  -- 'Bébés', 'Moyens', 'Grands'
  code VARCHAR(20),  -- 'BB', 'MO', 'GR'
  age_min_months INTEGER,  -- Minimum age in months
  age_max_months INTEGER,  -- Maximum age in months
  capacity INTEGER,  -- Maximum capacity

  -- UI customization
  color_hex VARCHAR(7),  -- Color for UI (#rrggbb)
  icon_name VARCHAR(50),  -- Icon name for UI

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(nursery_id, code)
);

CREATE INDEX idx_section_nursery ON section(nursery_id);
CREATE INDEX idx_section_active ON section(is_active);

COMMENT ON TABLE section IS 'Age groups/sections in a nursery (Bébés, Moyens, Grands)';
COMMENT ON COLUMN section.name IS 'Section name (e.g., Bébés, Moyens, Grands)';
COMMENT ON COLUMN section.code IS 'Short code for section (e.g., BB, MO, GR)';
COMMENT ON COLUMN section.age_min_months IS 'Minimum age in months';
COMMENT ON COLUMN section.age_max_months IS 'Maximum age in months';
COMMENT ON COLUMN section.capacity IS 'Maximum number of children';
COMMENT ON COLUMN section.color_hex IS 'Color for UI display (#rrggbb)';
COMMENT ON COLUMN section.display_order IS 'Order for display in lists';

-- ============================================================
-- TABLE: child_section
-- ============================================================
-- Tracks historical assignments of children to sections
-- A child can move from Bébés → Moyens → Grands over time
-- Only one active assignment per child at a time (end_date = NULL)
-- ============================================================

CREATE TABLE child_section (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES section(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE,  -- NULL = current assignment

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_child_section_child ON child_section(child_id);
CREATE INDEX idx_child_section_section ON child_section(section_id);
CREATE INDEX idx_child_section_dates ON child_section(start_date, end_date);
CREATE INDEX idx_child_section_current ON child_section(child_id, end_date) WHERE end_date IS NULL;

COMMENT ON TABLE child_section IS 'Historical assignments of children to sections';
COMMENT ON COLUMN child_section.start_date IS 'Start date of assignment';
COMMENT ON COLUMN child_section.end_date IS 'End date (NULL = current assignment)';

-- ============================================================
-- CONSTRAINT: Only one active section per child
-- ============================================================
-- Ensure a child can only have one active (end_date IS NULL) section at a time
-- ============================================================

CREATE UNIQUE INDEX idx_child_section_active_unique
  ON child_section(child_id)
  WHERE end_date IS NULL;

COMMENT ON INDEX idx_child_section_active_unique IS 'Ensures only one active section per child';

-- ============================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================

CREATE TRIGGER update_section_updated_at
  BEFORE UPDATE ON section
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END MIGRATION
-- ============================================================
