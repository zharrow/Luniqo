-- =====================================================
-- PHASE 3: PERSONNEL & PLANNING RH - PLANNING
-- Migration: 23_phase3_planning.sql
-- Description: Staff planning, shifts, absences, and availability
-- Tables: staff_shift, staff_absence, staff_availability
-- =====================================================

-- =====================================================
-- TABLE: staff_shift
-- Description: Staff work shifts and schedules
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_shift (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Date and time
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Break time
  break_start_time TIME,
  break_end_time TIME,
  break_duration_minutes INTEGER DEFAULT 0,

  -- Hours calculation (auto-calculated)
  total_hours DECIMAL(4,2),

  -- Shift type
  shift_type VARCHAR(20),  -- 'regular', 'overtime', 'on_call', 'night', 'weekend'

  -- Assignment
  assigned_room_id UUID REFERENCES room(id) ON DELETE SET NULL,
  assigned_section_id UUID REFERENCES section(id) ON DELETE SET NULL,
  role_during_shift VARCHAR(50),  -- 'lead', 'assistant', 'floater', 'support'

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled',  -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'

  -- Actual time tracking (clocking in/out)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_hours DECIMAL(4,2),

  -- Notes
  notes TEXT,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT chk_end_after_start CHECK (end_time > start_time),
  CONSTRAINT chk_break_times CHECK (
    (break_start_time IS NULL AND break_end_time IS NULL) OR
    (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND break_end_time > break_start_time)
  ),
  CONSTRAINT chk_break_duration_positive CHECK (break_duration_minutes >= 0),
  CONSTRAINT chk_total_hours_positive CHECK (total_hours IS NULL OR total_hours > 0),
  CONSTRAINT chk_actual_hours_positive CHECK (actual_hours IS NULL OR actual_hours > 0),
  CONSTRAINT chk_actual_end_after_start CHECK (
    actual_end_time IS NULL OR actual_start_time IS NULL OR actual_end_time > actual_start_time
  )
);

-- Indexes for staff_shift
CREATE INDEX idx_staff_shift_employee ON staff_shift(employee_id);
CREATE INDEX idx_staff_shift_nursery ON staff_shift(nursery_id);
CREATE INDEX idx_staff_shift_date ON staff_shift(shift_date);
CREATE INDEX idx_staff_shift_status ON staff_shift(status);
CREATE INDEX idx_staff_shift_room ON staff_shift(assigned_room_id);
CREATE INDEX idx_staff_shift_section ON staff_shift(assigned_section_id);
CREATE INDEX idx_staff_shift_employee_date ON staff_shift(employee_id, shift_date);
CREATE INDEX idx_staff_shift_nursery_date ON staff_shift(nursery_id, shift_date);

-- Comments
COMMENT ON TABLE staff_shift IS 'Staff work shifts and schedules';
COMMENT ON COLUMN staff_shift.shift_type IS 'Type of shift: regular, overtime, on_call, night, weekend';
COMMENT ON COLUMN staff_shift.status IS 'Shift status: scheduled, confirmed, in_progress, completed, cancelled, no_show';
COMMENT ON COLUMN staff_shift.role_during_shift IS 'Role during this shift: lead, assistant, floater, support';
COMMENT ON COLUMN staff_shift.total_hours IS 'Planned total hours (calculated automatically)';
COMMENT ON COLUMN staff_shift.actual_hours IS 'Actual hours worked (from clock in/out)';

-- =====================================================
-- TABLE: staff_absence
-- Description: Staff absences, leave requests, sick leave
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_absence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Absence type
  absence_type VARCHAR(50) NOT NULL,
  -- Types: 'vacation', 'sick_leave', 'maternity_leave', 'paternity_leave',
  --        'unpaid_leave', 'training', 'family_emergency', 'bereavement',
  --        'work_accident', 'childcare', 'medical_appointment'

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Duration
  total_days INTEGER,  -- Number of working days
  is_partial_day BOOLEAN DEFAULT FALSE,
  partial_hours DECIMAL(4,2),

  -- Justification
  justification_required BOOLEAN DEFAULT FALSE,
  justification_document_url TEXT,  -- Medical certificate, etc.
  justification_status VARCHAR(20),  -- 'pending', 'received', 'valid', 'invalid'

  -- Request status
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'cancelled'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Replacement
  replaced_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  replacement_notes TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_end_date_after_start CHECK (end_date >= start_date),
  CONSTRAINT chk_total_days_positive CHECK (total_days IS NULL OR total_days > 0),
  CONSTRAINT chk_partial_hours_positive CHECK (partial_hours IS NULL OR partial_hours > 0),
  CONSTRAINT chk_partial_requires_hours CHECK (
    (NOT is_partial_day) OR (is_partial_day AND partial_hours IS NOT NULL)
  )
);

-- Indexes for staff_absence
CREATE INDEX idx_staff_absence_employee ON staff_absence(employee_id);
CREATE INDEX idx_staff_absence_nursery ON staff_absence(nursery_id);
CREATE INDEX idx_staff_absence_dates ON staff_absence(start_date, end_date);
CREATE INDEX idx_staff_absence_status ON staff_absence(status);
CREATE INDEX idx_staff_absence_type ON staff_absence(absence_type);
CREATE INDEX idx_staff_absence_replaced_by ON staff_absence(replaced_by_id);
CREATE INDEX idx_staff_absence_pending ON staff_absence(nursery_id, status)
  WHERE status = 'pending';

-- Comments
COMMENT ON TABLE staff_absence IS 'Staff absences, leave requests, sick leave, etc.';
COMMENT ON COLUMN staff_absence.absence_type IS 'Type of absence: vacation, sick_leave, maternity_leave, paternity_leave, unpaid_leave, training, family_emergency, bereavement, work_accident, childcare, medical_appointment';
COMMENT ON COLUMN staff_absence.status IS 'Request status: pending, approved, rejected, cancelled';
COMMENT ON COLUMN staff_absence.total_days IS 'Number of working days (excluding weekends/holidays)';
COMMENT ON COLUMN staff_absence.justification_status IS 'Status of justification document: pending, received, valid, invalid';

-- =====================================================
-- TABLE: staff_availability
-- Description: Staff availability and preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Validity period
  valid_from DATE NOT NULL,
  valid_until DATE,  -- NULL = indefinite

  -- Day of week
  day_of_week INTEGER NOT NULL,  -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  available_start_time TIME,
  available_end_time TIME,

  -- Preference level
  preference VARCHAR(20),  -- 'preferred', 'available', 'unavailable', 'if_needed'

  -- Constraints
  max_hours_per_day DECIMAL(4,2),
  max_hours_per_week DECIMAL(5,2),

  -- Notes
  notes TEXT,  -- Personal constraints, reasons

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_day_of_week_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT chk_valid_until_after_from CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CONSTRAINT chk_available_times CHECK (
    (available_start_time IS NULL AND available_end_time IS NULL) OR
    (available_start_time IS NOT NULL AND available_end_time IS NOT NULL AND available_end_time > available_start_time)
  ),
  CONSTRAINT chk_max_hours_positive CHECK (
    (max_hours_per_day IS NULL OR max_hours_per_day > 0) AND
    (max_hours_per_week IS NULL OR max_hours_per_week > 0)
  )
);

-- Indexes for staff_availability
CREATE INDEX idx_staff_availability_employee ON staff_availability(employee_id);
CREATE INDEX idx_staff_availability_nursery ON staff_availability(nursery_id);
CREATE INDEX idx_staff_availability_day ON staff_availability(day_of_week);
CREATE INDEX idx_staff_availability_dates ON staff_availability(valid_from, valid_until);
CREATE INDEX idx_staff_availability_active ON staff_availability(employee_id, nursery_id, day_of_week)
  WHERE valid_until IS NULL OR valid_until >= CURRENT_DATE;

-- Comments
COMMENT ON TABLE staff_availability IS 'Staff availability and scheduling preferences';
COMMENT ON COLUMN staff_availability.day_of_week IS 'Day of week: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday';
COMMENT ON COLUMN staff_availability.preference IS 'Preference level: preferred, available, unavailable, if_needed';
COMMENT ON COLUMN staff_availability.valid_from IS 'Start date of this availability pattern';
COMMENT ON COLUMN staff_availability.valid_until IS 'End date of this availability pattern (NULL = indefinite)';

-- =====================================================
-- FUNCTION: Calculate shift total hours
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_shift_hours(
  p_start_time TIME,
  p_end_time TIME,
  p_break_minutes INTEGER
)
RETURNS DECIMAL(4,2) AS $$
DECLARE
  v_total_minutes INTEGER;
  v_total_hours DECIMAL(4,2);
BEGIN
  -- Calculate total minutes
  v_total_minutes := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60;

  -- Subtract break time
  v_total_minutes := v_total_minutes - COALESCE(p_break_minutes, 0);

  -- Convert to hours (rounded to 2 decimals)
  v_total_hours := ROUND((v_total_minutes / 60.0)::NUMERIC, 2);

  RETURN v_total_hours;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_shift_hours IS 'Calculate total hours for a shift given start time, end time, and break duration';

-- =====================================================
-- TRIGGER: Auto-calculate shift hours
-- =====================================================

CREATE OR REPLACE FUNCTION auto_calculate_shift_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate total_hours if not provided
  IF NEW.total_hours IS NULL THEN
    NEW.total_hours := calculate_shift_hours(
      NEW.start_time,
      NEW.end_time,
      NEW.break_duration_minutes
    );
  END IF;

  -- Auto-calculate actual_hours if both actual times are set
  IF NEW.actual_start_time IS NOT NULL AND NEW.actual_end_time IS NOT NULL THEN
    NEW.actual_hours := ROUND(
      EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time)) / 3600.0 -
      (NEW.break_duration_minutes / 60.0),
      2
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_shift_hours ON staff_shift;
CREATE TRIGGER trigger_auto_calculate_shift_hours
  BEFORE INSERT OR UPDATE ON staff_shift
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_shift_hours();

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_staff_shift_updated_at ON staff_shift;
CREATE TRIGGER update_staff_shift_updated_at
  BEFORE UPDATE ON staff_shift
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_absence_updated_at ON staff_absence;
CREATE TRIGGER update_staff_absence_updated_at
  BEFORE UPDATE ON staff_absence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_availability_updated_at ON staff_availability;
CREATE TRIGGER update_staff_availability_updated_at
  BEFORE UPDATE ON staff_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
