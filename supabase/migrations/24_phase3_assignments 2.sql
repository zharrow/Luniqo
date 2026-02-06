-- =====================================================
-- PHASE 3: PERSONNEL & PLANNING RH - ASSIGNMENTS
-- Migration: 24_phase3_assignments.sql
-- Description: Staff assignments to rooms and sections
-- Tables: staff_assignment
-- =====================================================

-- =====================================================
-- TABLE: staff_assignment
-- Description: Historical record of staff assignments to rooms/sections
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Assignment type and target
  assignment_type VARCHAR(20) NOT NULL,  -- 'room', 'section', 'floater'
  room_id UUID REFERENCES room(id) ON DELETE SET NULL,
  section_id UUID REFERENCES section(id) ON DELETE SET NULL,

  -- Role in assignment
  role VARCHAR(50),  -- 'lead_educator', 'assistant', 'floater', 'manager'

  -- Period
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL = current/ongoing assignment

  -- Primary assignment flag
  is_primary_assignment BOOLEAN DEFAULT TRUE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT chk_end_date_after_start CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_assignment_has_target CHECK (
    (assignment_type = 'floater') OR
    (assignment_type = 'room' AND room_id IS NOT NULL) OR
    (assignment_type = 'section' AND section_id IS NOT NULL)
  ),
  CONSTRAINT chk_room_or_section CHECK (
    (assignment_type = 'floater' AND room_id IS NULL AND section_id IS NULL) OR
    (assignment_type = 'room' AND room_id IS NOT NULL AND section_id IS NULL) OR
    (assignment_type = 'section' AND section_id IS NOT NULL AND room_id IS NULL)
  )
);

-- Indexes for staff_assignment
CREATE INDEX idx_staff_assignment_employee ON staff_assignment(employee_id);
CREATE INDEX idx_staff_assignment_nursery ON staff_assignment(nursery_id);
CREATE INDEX idx_staff_assignment_room ON staff_assignment(room_id);
CREATE INDEX idx_staff_assignment_section ON staff_assignment(section_id);
CREATE INDEX idx_staff_assignment_dates ON staff_assignment(start_date, end_date);
CREATE INDEX idx_staff_assignment_type ON staff_assignment(assignment_type);
CREATE INDEX idx_staff_assignment_primary ON staff_assignment(is_primary_assignment);

-- Current assignments index (end_date IS NULL)
CREATE INDEX idx_staff_assignment_current ON staff_assignment(employee_id, nursery_id)
  WHERE end_date IS NULL;

-- Primary current assignments
CREATE INDEX idx_staff_assignment_primary_current ON staff_assignment(employee_id, nursery_id, is_primary_assignment)
  WHERE end_date IS NULL AND is_primary_assignment = TRUE;

-- Comments
COMMENT ON TABLE staff_assignment IS 'Historical record of staff assignments to rooms, sections, or floater roles';
COMMENT ON COLUMN staff_assignment.assignment_type IS 'Type of assignment: room (assigned to specific room), section (assigned to age group section), floater (moves between rooms as needed)';
COMMENT ON COLUMN staff_assignment.role IS 'Role in this assignment: lead_educator, assistant, floater, manager';
COMMENT ON COLUMN staff_assignment.is_primary_assignment IS 'Whether this is the employee''s primary assignment (can have multiple non-primary)';
COMMENT ON COLUMN staff_assignment.end_date IS 'End date of assignment (NULL = current/ongoing)';

-- =====================================================
-- FUNCTION: Get current staff assignments for a nursery
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_staff_assignments(p_nursery_id UUID)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  assignment_type VARCHAR(20),
  room_id UUID,
  room_name TEXT,
  section_id UUID,
  section_name TEXT,
  role VARCHAR(50),
  is_primary BOOLEAN,
  start_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.employee_id,
    CONCAT(p.first_name, ' ', p.last_name) AS employee_name,
    sa.assignment_type,
    sa.room_id,
    r.name AS room_name,
    sa.section_id,
    s.name AS section_name,
    sa.role,
    sa.is_primary_assignment AS is_primary,
    sa.start_date
  FROM staff_assignment sa
  INNER JOIN profiles p ON sa.employee_id = p.id
  LEFT JOIN room r ON sa.room_id = r.id
  LEFT JOIN section s ON sa.section_id = s.id
  WHERE
    sa.nursery_id = p_nursery_id
    AND sa.end_date IS NULL  -- Only current assignments
  ORDER BY
    sa.is_primary_assignment DESC,
    p.last_name,
    p.first_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_staff_assignments IS 'Get all current (active) staff assignments for a nursery with employee and assignment details';

-- =====================================================
-- FUNCTION: Get staff assigned to a specific room
-- =====================================================

CREATE OR REPLACE FUNCTION get_staff_for_room(p_room_id UUID)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  role VARCHAR(50),
  is_primary BOOLEAN,
  start_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.employee_id,
    CONCAT(p.first_name, ' ', p.last_name) AS employee_name,
    sa.role,
    sa.is_primary_assignment AS is_primary,
    sa.start_date
  FROM staff_assignment sa
  INNER JOIN profiles p ON sa.employee_id = p.id
  WHERE
    sa.room_id = p_room_id
    AND sa.end_date IS NULL  -- Only current assignments
  ORDER BY
    sa.is_primary_assignment DESC,
    p.last_name,
    p.first_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_staff_for_room IS 'Get all staff currently assigned to a specific room';

-- =====================================================
-- FUNCTION: End an assignment
-- =====================================================

CREATE OR REPLACE FUNCTION end_staff_assignment(
  p_assignment_id UUID,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
BEGIN
  UPDATE staff_assignment
  SET
    end_date = p_end_date,
    updated_at = NOW()
  WHERE id = p_assignment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION end_staff_assignment IS 'End a staff assignment by setting the end_date';

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_staff_assignment_updated_at ON staff_assignment;
CREATE TRIGGER update_staff_assignment_updated_at
  BEFORE UPDATE ON staff_assignment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
