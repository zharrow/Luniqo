-- =====================================================================================
-- Phase 7: Statistiques & Analyses - Metric Snapshots
-- =====================================================================================
-- Description: Daily snapshots of key performance indicators (KPIs) for analytics
-- Tables: metric_snapshot
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

-- Metric types for categorization
CREATE TYPE metric_type AS ENUM (
  'OCCUPATION',        -- Occupancy rate metrics
  'FINANCIAL',         -- Revenue and financial metrics
  'STAFF',            -- Staff-related metrics
  'HACCP',            -- HACCP compliance metrics
  'PARENT_ENGAGEMENT' -- Parent portal engagement metrics
);

-- Metric frequency for aggregation
CREATE TYPE metric_frequency AS ENUM (
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY'
);

-- =====================================================================================
-- TABLE: metric_snapshot
-- =====================================================================================
-- Stores daily snapshots of KPIs for trend analysis and historical reporting
-- Partitioned by date for optimized queries on time ranges

CREATE TABLE metric_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  metric_type metric_type NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- e.g., "occupancy_rate", "mrr", "staff_absenteeism"

  -- Metric values
  metric_value DECIMAL(15, 2) NOT NULL, -- The actual metric value
  metric_unit VARCHAR(20), -- e.g., "%", "EUR", "hours", "count"

  -- Contextual data (JSON for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (e.g., breakdown by section)

  -- Trend indicators
  previous_value DECIMAL(15, 2), -- Value from previous period (for comparison)
  change_percentage DECIMAL(5, 2), -- % change from previous period
  is_anomaly BOOLEAN DEFAULT FALSE, -- Flagged if value deviates significantly

  -- Frequency
  frequency metric_frequency DEFAULT 'DAILY',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(nursery_id, snapshot_date, metric_name, frequency)
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Primary lookup: Get metrics for a nursery on a specific date
CREATE INDEX idx_metric_snapshot_nursery_date
ON metric_snapshot(nursery_id, snapshot_date DESC);

-- Filter by metric type
CREATE INDEX idx_metric_snapshot_type
ON metric_snapshot(nursery_id, metric_type, snapshot_date DESC);

-- Filter by specific metric name
CREATE INDEX idx_metric_snapshot_name
ON metric_snapshot(nursery_id, metric_name, snapshot_date DESC);

-- Find anomalies
CREATE INDEX idx_metric_snapshot_anomalies
ON metric_snapshot(nursery_id, is_anomaly, snapshot_date DESC)
WHERE is_anomaly = TRUE;

-- Date range queries (for trends)
CREATE INDEX idx_metric_snapshot_date_range
ON metric_snapshot(snapshot_date DESC, nursery_id);

-- JSONB metadata queries (GIN index for fast JSON searches)
CREATE INDEX idx_metric_snapshot_metadata
ON metric_snapshot USING GIN(metadata);

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

ALTER TABLE metric_snapshot ENABLE ROW LEVEL SECURITY;

-- Owners can view metrics for their nurseries
CREATE POLICY metric_snapshot_owner_select
ON metric_snapshot FOR SELECT
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

-- System can insert snapshots (for cron jobs)
CREATE POLICY metric_snapshot_system_insert
ON metric_snapshot FOR INSERT
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

-- Owners can update snapshots (e.g., to flag anomalies manually)
CREATE POLICY metric_snapshot_owner_update
ON metric_snapshot FOR UPDATE
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

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to calculate change percentage between two values
CREATE OR REPLACE FUNCTION calculate_change_percentage(
  current_value DECIMAL,
  previous_value DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  IF previous_value IS NULL OR previous_value = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ROUND(((current_value - previous_value) / previous_value * 100)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to detect anomalies (simple statistical approach)
-- Anomaly = value deviates more than 2 standard deviations from 7-day average
CREATE OR REPLACE FUNCTION detect_metric_anomaly(
  p_nursery_id UUID,
  p_metric_name VARCHAR,
  p_current_value DECIMAL,
  p_current_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_avg DECIMAL;
  v_stddev DECIMAL;
  v_threshold DECIMAL;
BEGIN
  -- Calculate average and standard deviation from last 7 days (excluding current day)
  SELECT
    AVG(metric_value),
    STDDEV(metric_value)
  INTO v_avg, v_stddev
  FROM metric_snapshot
  WHERE nursery_id = p_nursery_id
    AND metric_name = p_metric_name
    AND snapshot_date >= p_current_date - INTERVAL '7 days'
    AND snapshot_date < p_current_date
    AND frequency = 'DAILY';

  -- If not enough data, not an anomaly
  IF v_avg IS NULL OR v_stddev IS NULL OR v_stddev = 0 THEN
    RETURN FALSE;
  END IF;

  -- Check if current value is more than 2 standard deviations away
  v_threshold := 2 * v_stddev;

  RETURN ABS(p_current_value - v_avg) > v_threshold;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE metric_snapshot IS 'Daily snapshots of KPIs for trend analysis and historical reporting';
COMMENT ON COLUMN metric_snapshot.metric_value IS 'The actual metric value (e.g., 85.5 for 85.5% occupancy)';
COMMENT ON COLUMN metric_snapshot.metadata IS 'Additional context in JSON format (e.g., breakdown by section)';
COMMENT ON COLUMN metric_snapshot.is_anomaly IS 'Flagged if value deviates significantly from historical average';
COMMENT ON COLUMN metric_snapshot.change_percentage IS 'Percentage change from previous period';
