-- =====================================================================================
-- Phase 7: Statistiques & Analyses - Custom Reports
-- =====================================================================================
-- Description: Custom report configurations and templates for owners
-- Tables: custom_report, report_execution_log
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

-- Report types
CREATE TYPE report_type AS ENUM (
  'FINANCIAL',           -- Financial reports (revenue, payments, invoices)
  'OCCUPANCY',          -- Occupancy and capacity reports
  'STAFF',              -- Staff hours, absences, ratios
  'HACCP',              -- HACCP compliance and incidents
  'CHILDREN',           -- Children and family reports
  'PARENT_ENGAGEMENT',  -- Parent portal engagement
  'CUSTOM'              -- Fully custom report
);

-- Report format for exports
CREATE TYPE report_format AS ENUM (
  'PDF',
  'EXCEL',
  'CSV',
  'JSON'
);

-- Report schedule frequency
CREATE TYPE report_schedule_frequency AS ENUM (
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
  'MANUAL'
);

-- Report execution status
CREATE TYPE report_execution_status AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED'
);

-- =====================================================================================
-- TABLE: custom_report
-- =====================================================================================
-- Stores custom report configurations created by owners

CREATE TABLE custom_report (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Report metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type report_type NOT NULL,

  -- Report configuration (stored as JSON for flexibility)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- config structure example:
  -- {
  --   "metrics": ["occupancy_rate", "mrr", "staff_count"],
  --   "filters": {
  --     "date_range": { "start": "2025-01-01", "end": "2025-12-31" },
  --     "sections": ["section-uuid-1", "section-uuid-2"]
  --   },
  --   "groupBy": ["month", "section"],
  --   "aggregations": { "occupancy_rate": "avg", "mrr": "sum" },
  --   "sortBy": "date_desc"
  -- }

  -- Scheduling
  schedule_enabled BOOLEAN DEFAULT FALSE,
  schedule_frequency report_schedule_frequency DEFAULT 'MANUAL',
  schedule_day_of_week INT, -- 0-6 (Sunday-Saturday) for WEEKLY
  schedule_day_of_month INT, -- 1-31 for MONTHLY
  schedule_time TIME DEFAULT '08:00:00',
  next_execution_date TIMESTAMPTZ,

  -- Export settings
  default_format report_format DEFAULT 'PDF',
  auto_send_email BOOLEAN DEFAULT FALSE,
  recipient_emails TEXT[], -- Array of email addresses

  -- Template settings
  is_template BOOLEAN DEFAULT FALSE, -- Can be reused by other reports
  is_shared BOOLEAN DEFAULT FALSE, -- Shared with other nurseries in enterprise

  -- Metadata
  last_executed_at TIMESTAMPTZ,
  execution_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- TABLE: report_execution_log
-- =====================================================================================
-- Logs each report execution for audit and debugging

CREATE TABLE report_execution_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  report_id UUID NOT NULL REFERENCES custom_report(id) ON DELETE CASCADE,
  executed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Execution metadata
  execution_status report_execution_status DEFAULT 'PENDING',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT, -- Execution time in milliseconds

  -- Output
  output_format report_format NOT NULL,
  output_url TEXT, -- URL to download generated file
  row_count INT, -- Number of rows in the report

  -- Error handling
  error_message TEXT,
  error_stack TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- custom_report indexes
CREATE INDEX idx_custom_report_nursery
ON custom_report(nursery_id, created_at DESC);

CREATE INDEX idx_custom_report_type
ON custom_report(nursery_id, report_type);

CREATE INDEX idx_custom_report_created_by
ON custom_report(created_by_id, created_at DESC);

CREATE INDEX idx_custom_report_templates
ON custom_report(nursery_id, is_template)
WHERE is_template = TRUE;

CREATE INDEX idx_custom_report_scheduled
ON custom_report(schedule_enabled, next_execution_date)
WHERE schedule_enabled = TRUE;

-- JSONB config queries (GIN index for fast JSON searches)
CREATE INDEX idx_custom_report_config
ON custom_report USING GIN(config);

-- report_execution_log indexes
CREATE INDEX idx_report_execution_report
ON report_execution_log(report_id, started_at DESC);

CREATE INDEX idx_report_execution_status
ON report_execution_log(execution_status, started_at DESC);

CREATE INDEX idx_report_execution_user
ON report_execution_log(executed_by_id, started_at DESC);

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_custom_report_updated_at
BEFORE UPDATE ON custom_report
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update execution count and last_executed_at when report completes
CREATE OR REPLACE FUNCTION update_report_execution_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.execution_status = 'COMPLETED' AND OLD.execution_status != 'COMPLETED' THEN
    UPDATE custom_report
    SET
      execution_count = execution_count + 1,
      last_executed_at = NEW.completed_at
    WHERE id = NEW.report_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_execution_stats
AFTER UPDATE ON report_execution_log
FOR EACH ROW
WHEN (NEW.execution_status = 'COMPLETED')
EXECUTE FUNCTION update_report_execution_stats();

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

ALTER TABLE custom_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_execution_log ENABLE ROW LEVEL SECURITY;

-- custom_report policies
-- Owners can view reports for their nurseries
CREATE POLICY custom_report_owner_select
ON custom_report FOR SELECT
TO authenticated
USING (
  nursery_id IN (
    SELECT n.id
    FROM nursery n
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- Owners can create reports for their nurseries
CREATE POLICY custom_report_owner_insert
ON custom_report FOR INSERT
TO authenticated
WITH CHECK (
  nursery_id IN (
    SELECT n.id
    FROM nursery n
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- Owners can update their own reports
CREATE POLICY custom_report_owner_update
ON custom_report FOR UPDATE
TO authenticated
USING (
  nursery_id IN (
    SELECT n.id
    FROM nursery n
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- Owners can delete their own reports
CREATE POLICY custom_report_owner_delete
ON custom_report FOR DELETE
TO authenticated
USING (
  nursery_id IN (
    SELECT n.id
    FROM nursery n
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- report_execution_log policies
-- Owners can view execution logs for their reports
CREATE POLICY report_execution_log_owner_select
ON report_execution_log FOR SELECT
TO authenticated
USING (
  report_id IN (
    SELECT cr.id
    FROM custom_report cr
    JOIN nursery n ON cr.nursery_id = n.id
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- System can insert execution logs
CREATE POLICY report_execution_log_system_insert
ON report_execution_log FOR INSERT
TO authenticated
WITH CHECK (
  report_id IN (
    SELECT cr.id
    FROM custom_report cr
    JOIN nursery n ON cr.nursery_id = n.id
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- System can update execution logs (status, completion time)
CREATE POLICY report_execution_log_system_update
ON report_execution_log FOR UPDATE
TO authenticated
USING (
  report_id IN (
    SELECT cr.id
    FROM custom_report cr
    JOIN nursery n ON cr.nursery_id = n.id
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to schedule next execution date
CREATE OR REPLACE FUNCTION calculate_next_execution_date(
  p_frequency report_schedule_frequency,
  p_day_of_week INT,
  p_day_of_month INT,
  p_time TIME,
  p_from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_date TIMESTAMPTZ;
BEGIN
  CASE p_frequency
    WHEN 'DAILY' THEN
      v_next_date := (DATE(p_from_date) + INTERVAL '1 day' + p_time::INTERVAL);

    WHEN 'WEEKLY' THEN
      -- Find next occurrence of specified day of week
      v_next_date := (
        DATE(p_from_date) +
        ((p_day_of_week - EXTRACT(DOW FROM p_from_date)::INT + 7) % 7)::INT +
        INTERVAL '1 day' * CASE WHEN EXTRACT(DOW FROM p_from_date)::INT >= p_day_of_week THEN 7 ELSE 0 END +
        p_time::INTERVAL
      );

    WHEN 'MONTHLY' THEN
      -- Find next occurrence of specified day of month
      v_next_date := (
        DATE_TRUNC('month', p_from_date) +
        INTERVAL '1 month' +
        (p_day_of_month - 1) * INTERVAL '1 day' +
        p_time::INTERVAL
      );

    WHEN 'QUARTERLY' THEN
      v_next_date := (
        DATE_TRUNC('quarter', p_from_date) +
        INTERVAL '3 months' +
        (p_day_of_month - 1) * INTERVAL '1 day' +
        p_time::INTERVAL
      );

    WHEN 'YEARLY' THEN
      v_next_date := (
        DATE_TRUNC('year', p_from_date) +
        INTERVAL '1 year' +
        (p_day_of_month - 1) * INTERVAL '1 day' +
        p_time::INTERVAL
      );

    ELSE
      RETURN NULL; -- MANUAL frequency has no automatic scheduling
  END CASE;

  -- If calculated date is in the past, add another period
  IF v_next_date <= p_from_date THEN
    RETURN calculate_next_execution_date(p_frequency, p_day_of_week, p_day_of_month, p_time, v_next_date);
  END IF;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE custom_report IS 'Custom report configurations created by owners';
COMMENT ON TABLE report_execution_log IS 'Audit log of report executions';
COMMENT ON COLUMN custom_report.config IS 'Report configuration in JSON format (metrics, filters, aggregations)';
COMMENT ON COLUMN custom_report.schedule_enabled IS 'Whether automatic scheduled execution is enabled';
COMMENT ON COLUMN report_execution_log.duration_ms IS 'Report execution time in milliseconds';
