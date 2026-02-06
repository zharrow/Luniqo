-- =====================================================
-- PHASE 3: PERSONNEL & PLANNING RH - COMPLIANCE
-- Migration: 25_phase3_compliance.sql
-- Description: Regulatory compliance and staff-to-children ratio tracking
-- Tables: regulatory_report, ratio_log
-- =====================================================

-- =====================================================
-- TABLE: regulatory_report
-- Description: Compliance reports for regulatory requirements
-- =====================================================

CREATE TABLE IF NOT EXISTS regulatory_report (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Report details
  report_type VARCHAR(50) NOT NULL,
  -- Types: 'daily_ratio', 'qualification_check', 'inspection_preparation',
  --        'monthly_summary', 'incident_report', 'safety_compliance'
  report_date DATE NOT NULL,
  report_period_start DATE,
  report_period_end DATE,

  -- Compliance status
  compliance_status VARCHAR(20) NOT NULL,  -- 'compliant', 'non_compliant', 'warning', 'under_review'

  -- Report data (stored as JSON)
  report_data JSONB,

  -- Generated file
  report_file_url TEXT,  -- PDF report (Supabase Storage)

  -- Notes and actions
  notes TEXT,
  corrective_actions_required TEXT,
  corrective_actions_taken TEXT,

  -- Who generated/verified
  generated_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_period_valid CHECK (
    (report_period_start IS NULL AND report_period_end IS NULL) OR
    (report_period_start IS NOT NULL AND report_period_end IS NOT NULL AND report_period_end >= report_period_start)
  )
);

-- Indexes for regulatory_report
CREATE INDEX idx_regulatory_report_nursery ON regulatory_report(nursery_id);
CREATE INDEX idx_regulatory_report_type ON regulatory_report(report_type);
CREATE INDEX idx_regulatory_report_date ON regulatory_report(report_date);
CREATE INDEX idx_regulatory_report_status ON regulatory_report(compliance_status);
CREATE INDEX idx_regulatory_report_period ON regulatory_report(report_period_start, report_period_end);

-- GIN index for JSONB data
CREATE INDEX idx_regulatory_report_data ON regulatory_report USING GIN (report_data);

-- Comments
COMMENT ON TABLE regulatory_report IS 'Regulatory compliance reports for nurseries';
COMMENT ON COLUMN regulatory_report.report_type IS 'Type of report: daily_ratio, qualification_check, inspection_preparation, monthly_summary, incident_report, safety_compliance';
COMMENT ON COLUMN regulatory_report.compliance_status IS 'Compliance status: compliant, non_compliant, warning, under_review';
COMMENT ON COLUMN regulatory_report.report_data IS 'Structured report data stored as JSON';

-- =====================================================
-- TABLE: ratio_log
-- Description: Real-time tracking of staff-to-children ratios
-- =====================================================

CREATE TABLE IF NOT EXISTS ratio_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  room_id UUID REFERENCES room(id) ON DELETE SET NULL,
  section_id UUID REFERENCES section(id) ON DELETE SET NULL,

  -- Timestamp
  log_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_hour INTEGER NOT NULL,  -- Hour of day (0-23)

  -- Children counts
  children_present INTEGER NOT NULL,
  children_under_18_months INTEGER DEFAULT 0,  -- Babies (ratio 1:5)
  children_over_18_months INTEGER DEFAULT 0,   -- Older children (ratio 1:8)

  -- Staff counts
  staff_present INTEGER NOT NULL,
  qualified_staff_present INTEGER DEFAULT 0,  -- Qualified staff (EJE, AP, etc.)

  -- Calculated ratios
  actual_ratio DECIMAL(5,2),  -- Actual children:staff ratio
  required_ratio DECIMAL(5,2),  -- Required ratio based on ages

  -- Compliance
  is_compliant BOOLEAN NOT NULL,
  non_compliance_severity VARCHAR(20),  -- 'minor', 'moderate', 'critical'

  -- Actions taken
  alert_triggered BOOLEAN DEFAULT FALSE,
  alert_sent_to TEXT[],  -- Array of employee IDs who were alerted
  action_taken TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_children_counts_valid CHECK (
    children_present >= 0 AND
    children_under_18_months >= 0 AND
    children_over_18_months >= 0 AND
    children_present = (children_under_18_months + children_over_18_months)
  ),
  CONSTRAINT chk_staff_counts_valid CHECK (
    staff_present >= 0 AND
    qualified_staff_present >= 0 AND
    qualified_staff_present <= staff_present
  ),
  CONSTRAINT chk_log_hour_range CHECK (log_hour >= 0 AND log_hour <= 23),
  CONSTRAINT chk_ratios_positive CHECK (
    (actual_ratio IS NULL OR actual_ratio >= 0) AND
    (required_ratio IS NULL OR required_ratio >= 0)
  ),
  CONSTRAINT chk_severity_when_non_compliant CHECK (
    is_compliant OR (NOT is_compliant AND non_compliance_severity IS NOT NULL)
  )
);

-- Indexes for ratio_log
CREATE INDEX idx_ratio_log_nursery ON ratio_log(nursery_id);
CREATE INDEX idx_ratio_log_date ON ratio_log(log_date);
CREATE INDEX idx_ratio_log_timestamp ON ratio_log(log_timestamp);
CREATE INDEX idx_ratio_log_compliant ON ratio_log(is_compliant);
CREATE INDEX idx_ratio_log_room ON ratio_log(room_id);
CREATE INDEX idx_ratio_log_section ON ratio_log(section_id);
CREATE INDEX idx_ratio_log_nursery_date_hour ON ratio_log(nursery_id, log_date, log_hour);

-- Non-compliant logs for quick alerts
CREATE INDEX idx_ratio_log_non_compliant ON ratio_log(nursery_id, log_date, is_compliant)
  WHERE NOT is_compliant;

-- Comments
COMMENT ON TABLE ratio_log IS 'Real-time tracking of staff-to-children ratios for regulatory compliance';
COMMENT ON COLUMN ratio_log.log_hour IS 'Hour of the day (0-23)';
COMMENT ON COLUMN ratio_log.children_under_18_months IS 'Children < 18 months old (ratio requirement 1:5)';
COMMENT ON COLUMN ratio_log.children_over_18_months IS 'Children ≥ 18 months old (ratio requirement 1:8)';
COMMENT ON COLUMN ratio_log.qualified_staff_present IS 'Number of qualified staff (EJE, Auxiliaire puériculture, etc.)';
COMMENT ON COLUMN ratio_log.actual_ratio IS 'Actual children:staff ratio';
COMMENT ON COLUMN ratio_log.required_ratio IS 'Required ratio based on age mix';
COMMENT ON COLUMN ratio_log.is_compliant IS 'Whether the ratio meets regulatory requirements';
COMMENT ON COLUMN ratio_log.non_compliance_severity IS 'Severity level if non-compliant: minor, moderate, critical';

-- =====================================================
-- FUNCTION: Calculate required ratio based on age mix
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_required_ratio(
  p_children_under_18_months INTEGER,
  p_children_over_18_months INTEGER
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_required_staff DECIMAL(5,2);
  v_total_children INTEGER;
  v_required_ratio DECIMAL(5,2);
BEGIN
  -- French regulations:
  -- - Children < 18 months: 1 staff for 5 children (ratio 1:5)
  -- - Children >= 18 months: 1 staff for 8 children (ratio 1:8)

  v_total_children := p_children_under_18_months + p_children_over_18_months;

  IF v_total_children = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate required staff based on age mix
  v_required_staff := (p_children_under_18_months / 5.0) + (p_children_over_18_months / 8.0);

  -- Round up to ensure adequate staffing
  v_required_staff := CEIL(v_required_staff);

  -- Calculate the required ratio
  v_required_ratio := v_total_children / v_required_staff;

  RETURN ROUND(v_required_ratio, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_required_ratio IS 'Calculate required staff-to-children ratio based on age distribution (French regulations: 1:5 for <18mo, 1:8 for ≥18mo)';

-- =====================================================
-- FUNCTION: Check if ratio is compliant
-- =====================================================

CREATE OR REPLACE FUNCTION is_ratio_compliant(
  p_children_present INTEGER,
  p_children_under_18_months INTEGER,
  p_children_over_18_months INTEGER,
  p_staff_present INTEGER,
  p_qualified_staff_present INTEGER
)
RETURNS TABLE (
  is_compliant BOOLEAN,
  actual_ratio DECIMAL(5,2),
  required_ratio DECIMAL(5,2),
  qualified_percentage DECIMAL(5,2),
  severity VARCHAR(20),
  reason TEXT
) AS $$
DECLARE
  v_required_staff DECIMAL(5,2);
  v_actual_ratio DECIMAL(5,2);
  v_required_ratio DECIMAL(5,2);
  v_qualified_pct DECIMAL(5,2);
  v_is_compliant BOOLEAN := TRUE;
  v_severity VARCHAR(20) := NULL;
  v_reason TEXT := '';
BEGIN
  -- No children = compliant
  IF p_children_present = 0 THEN
    RETURN QUERY SELECT TRUE, 0::DECIMAL(5,2), 0::DECIMAL(5,2), 100::DECIMAL(5,2), NULL::VARCHAR(20), 'No children present'::TEXT;
    RETURN;
  END IF;

  -- No staff = non-compliant
  IF p_staff_present = 0 THEN
    RETURN QUERY SELECT FALSE, 999::DECIMAL(5,2), 0::DECIMAL(5,2), 0::DECIMAL(5,2), 'critical'::VARCHAR(20), 'No staff present'::TEXT;
    RETURN;
  END IF;

  -- Calculate actual ratio
  v_actual_ratio := ROUND((p_children_present::DECIMAL / p_staff_present::DECIMAL), 2);

  -- Calculate required ratio
  v_required_ratio := calculate_required_ratio(p_children_under_18_months, p_children_over_18_months);

  -- Check ratio compliance
  IF v_actual_ratio > v_required_ratio THEN
    v_is_compliant := FALSE;
    v_reason := 'Ratio exceeded: ' || v_actual_ratio || ':1 (required: ' || v_required_ratio || ':1)';

    -- Determine severity
    IF v_actual_ratio > (v_required_ratio * 1.5) THEN
      v_severity := 'critical';
    ELSIF v_actual_ratio > (v_required_ratio * 1.2) THEN
      v_severity := 'moderate';
    ELSE
      v_severity := 'minor';
    END IF;
  END IF;

  -- Calculate qualified staff percentage
  v_qualified_pct := ROUND((p_qualified_staff_present::DECIMAL / p_staff_present::DECIMAL) * 100, 2);

  -- Check qualified staff requirement (must be >= 50%)
  IF v_qualified_pct < 50 THEN
    v_is_compliant := FALSE;
    IF v_reason != '' THEN
      v_reason := v_reason || '; ';
    END IF;
    v_reason := v_reason || 'Insufficient qualified staff: ' || v_qualified_pct || '% (required: ≥50%)';

    IF v_severity IS NULL OR v_severity = 'minor' THEN
      v_severity := 'moderate';
    END IF;
  END IF;

  RETURN QUERY SELECT v_is_compliant, v_actual_ratio, v_required_ratio, v_qualified_pct, v_severity, v_reason;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_ratio_compliant IS 'Check if current staffing meets French regulatory requirements (ratio and qualified staff percentage)';

-- =====================================================
-- FUNCTION: Log current ratio
-- =====================================================

CREATE OR REPLACE FUNCTION log_current_ratio(
  p_nursery_id UUID,
  p_room_id UUID DEFAULT NULL,
  p_section_id UUID DEFAULT NULL,
  p_children_present INTEGER DEFAULT 0,
  p_children_under_18_months INTEGER DEFAULT 0,
  p_children_over_18_months INTEGER DEFAULT 0,
  p_staff_present INTEGER DEFAULT 0,
  p_qualified_staff_present INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_compliance_check RECORD;
  v_log_id UUID;
  v_current_hour INTEGER;
BEGIN
  v_current_hour := EXTRACT(HOUR FROM NOW());

  -- Check compliance
  SELECT * INTO v_compliance_check
  FROM is_ratio_compliant(
    p_children_present,
    p_children_under_18_months,
    p_children_over_18_months,
    p_staff_present,
    p_qualified_staff_present
  );

  -- Insert log
  INSERT INTO ratio_log (
    nursery_id,
    room_id,
    section_id,
    log_timestamp,
    log_date,
    log_hour,
    children_present,
    children_under_18_months,
    children_over_18_months,
    staff_present,
    qualified_staff_present,
    actual_ratio,
    required_ratio,
    is_compliant,
    non_compliance_severity,
    notes
  ) VALUES (
    p_nursery_id,
    p_room_id,
    p_section_id,
    NOW(),
    CURRENT_DATE,
    v_current_hour,
    p_children_present,
    p_children_under_18_months,
    p_children_over_18_months,
    p_staff_present,
    p_qualified_staff_present,
    v_compliance_check.actual_ratio,
    v_compliance_check.required_ratio,
    v_compliance_check.is_compliant,
    v_compliance_check.severity,
    v_compliance_check.reason
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_current_ratio IS 'Log the current staff-to-children ratio and check compliance';

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_regulatory_report_updated_at ON regulatory_report;
CREATE TRIGGER update_regulatory_report_updated_at
  BEFORE UPDATE ON regulatory_report
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
