-- =====================================================================================
-- Phase 7: Statistiques & Analyses - Dashboard Widgets
-- =====================================================================================
-- Description: Customizable dashboard widgets for owners
-- Tables: dashboard_widget, dashboard_template
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

-- Widget types
CREATE TYPE widget_type AS ENUM (
  'KPI_CARD',           -- Single metric card with trend
  'LINE_CHART',         -- Line chart for trends
  'BAR_CHART',          -- Bar chart for comparisons
  'PIE_CHART',          -- Pie chart for distributions
  'AREA_CHART',         -- Area chart for cumulative trends
  'GAUGE_CHART',        -- Gauge for percentages/ratios
  'FUNNEL_CHART',       -- Funnel for conversion rates
  'HEATMAP',            -- Heatmap for time-based data
  'DATA_TABLE',         -- Sortable data table
  'RANKING_LIST'        -- Top N ranking list
);

-- Widget size presets (for grid layout)
CREATE TYPE widget_size AS ENUM (
  'SMALL',    -- 1x1 grid cells
  'MEDIUM',   -- 2x1 grid cells
  'LARGE',    -- 2x2 grid cells
  'XLARGE'    -- 3x2 grid cells
);

-- Refresh frequency
CREATE TYPE widget_refresh_frequency AS ENUM (
  'REALTIME',   -- Updates every 30 seconds
  'FAST',       -- Updates every 5 minutes
  'NORMAL',     -- Updates every 15 minutes
  'SLOW',       -- Updates every hour
  'MANUAL'      -- Manual refresh only
);

-- =====================================================================================
-- TABLE: dashboard_template
-- =====================================================================================
-- Predefined dashboard templates for quick setup

CREATE TABLE dashboard_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- e.g., "Financier", "Opérationnel", "RH"

  -- Template configuration (array of widget configs)
  widgets_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure example:
  -- [
  --   {
  --     "type": "KPI_CARD",
  --     "metric": "occupancy_rate",
  --     "position": { "x": 0, "y": 0, "w": 1, "h": 1 }
  --   },
  --   ...
  -- ]

  -- Metadata
  is_default BOOLEAN DEFAULT FALSE, -- Default template for new users
  usage_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- TABLE: dashboard_widget
-- =====================================================================================
-- User-customized dashboard widgets

CREATE TABLE dashboard_widget (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Widget configuration
  widget_type widget_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Data source configuration (stored as JSON)
  data_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure example:
  -- {
  --   "metric": "occupancy_rate",
  --   "timeRange": "last_30_days",
  --   "filters": { "section_id": "uuid" },
  --   "aggregation": "avg",
  --   "groupBy": "day"
  -- }

  -- Layout configuration (for drag & drop grid)
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 1, -- Grid cells width
  height INT NOT NULL DEFAULT 1, -- Grid cells height
  size_preset widget_size DEFAULT 'MEDIUM',

  -- Display settings
  color_scheme VARCHAR(50) DEFAULT 'default', -- e.g., "default", "success", "warning", "danger"
  show_legend BOOLEAN DEFAULT TRUE,
  show_grid BOOLEAN DEFAULT TRUE,
  show_tooltip BOOLEAN DEFAULT TRUE,

  -- Refresh settings
  refresh_frequency widget_refresh_frequency DEFAULT 'NORMAL',
  last_refreshed_at TIMESTAMPTZ,

  -- Cache (optional - for performance)
  cached_data JSONB,
  cache_expires_at TIMESTAMPTZ,

  -- Visibility
  is_visible BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0, -- For manual sorting

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- dashboard_template indexes
CREATE INDEX idx_dashboard_template_category
ON dashboard_template(category);

CREATE INDEX idx_dashboard_template_default
ON dashboard_template(is_default)
WHERE is_default = TRUE;

-- JSONB widgets_config queries
CREATE INDEX idx_dashboard_template_widgets
ON dashboard_template USING GIN(widgets_config);

-- dashboard_widget indexes
CREATE INDEX idx_dashboard_widget_owner
ON dashboard_widget(owner_id, display_order);

CREATE INDEX idx_dashboard_widget_nursery
ON dashboard_widget(nursery_id, display_order);

CREATE INDEX idx_dashboard_widget_visible
ON dashboard_widget(owner_id, nursery_id, is_visible, display_order)
WHERE is_visible = TRUE;

CREATE INDEX idx_dashboard_widget_position
ON dashboard_widget(owner_id, nursery_id, position_x, position_y);

-- JSONB data_config queries
CREATE INDEX idx_dashboard_widget_config
ON dashboard_widget USING GIN(data_config);

-- JSONB cached_data queries (for fast dashboard load)
CREATE INDEX idx_dashboard_widget_cache
ON dashboard_widget USING GIN(cached_data);

CREATE INDEX idx_dashboard_widget_cache_expiry
ON dashboard_widget(cache_expires_at)
WHERE cache_expires_at IS NOT NULL;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_dashboard_template_updated_at
BEFORE UPDATE ON dashboard_template
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widget_updated_at
BEFORE UPDATE ON dashboard_widget
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Increment template usage count when applied
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger would be called when widgets are created from a template
  -- Implementation depends on how templates are applied in the application
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

ALTER TABLE dashboard_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widget ENABLE ROW LEVEL SECURITY;

-- dashboard_template policies (public read access)
-- Everyone can view templates
CREATE POLICY dashboard_template_select_all
ON dashboard_template FOR SELECT
TO authenticated
USING (TRUE);

-- dashboard_widget policies
-- Owners can view their own widgets
CREATE POLICY dashboard_widget_owner_select
ON dashboard_widget FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Owners can create widgets for their nurseries
CREATE POLICY dashboard_widget_owner_insert
ON dashboard_widget FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND nursery_id IN (
    SELECT n.id
    FROM nursery n
    JOIN enterprise e ON n.enterprise_id = e.id
    JOIN profiles p ON e.owner_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- Owners can update their own widgets
CREATE POLICY dashboard_widget_owner_update
ON dashboard_widget FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- Owners can delete their own widgets
CREATE POLICY dashboard_widget_owner_delete
ON dashboard_widget FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to get default dashboard config for new owners
CREATE OR REPLACE FUNCTION get_default_dashboard_widgets(
  p_owner_id UUID,
  p_nursery_id UUID
)
RETURNS TABLE (
  widget_type widget_type,
  title VARCHAR,
  data_config JSONB,
  position_x INT,
  position_y INT,
  width INT,
  height INT
) AS $$
BEGIN
  -- Return default widgets configuration
  RETURN QUERY
  SELECT
    'KPI_CARD'::widget_type,
    'Taux d''occupation'::VARCHAR,
    '{"metric": "occupancy_rate", "timeRange": "today"}'::JSONB,
    0, 0, 1, 1
  UNION ALL
  SELECT
    'KPI_CARD'::widget_type,
    'Chiffre d''affaires mensuel'::VARCHAR,
    '{"metric": "mrr", "timeRange": "current_month"}'::JSONB,
    1, 0, 1, 1
  UNION ALL
  SELECT
    'KPI_CARD'::widget_type,
    'Conformité HACCP'::VARCHAR,
    '{"metric": "haccp_compliance", "timeRange": "current_month"}'::JSONB,
    2, 0, 1, 1
  UNION ALL
  SELECT
    'LINE_CHART'::widget_type,
    'Évolution occupation (12 mois)'::VARCHAR,
    '{"metric": "occupancy_rate", "timeRange": "last_12_months", "groupBy": "month"}'::JSONB,
    0, 1, 2, 1
  UNION ALL
  SELECT
    'BAR_CHART'::widget_type,
    'Revenue par section'::VARCHAR,
    '{"metric": "revenue", "timeRange": "current_month", "groupBy": "section"}'::JSONB,
    2, 1, 1, 1;
END;
$$ LANGUAGE plpgsql;

-- Function to create default dashboard for new owner
CREATE OR REPLACE FUNCTION create_default_dashboard(
  p_owner_id UUID,
  p_nursery_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_widget RECORD;
BEGIN
  -- Insert default widgets
  FOR v_widget IN
    SELECT * FROM get_default_dashboard_widgets(p_owner_id, p_nursery_id)
  LOOP
    INSERT INTO dashboard_widget (
      owner_id,
      nursery_id,
      widget_type,
      title,
      data_config,
      position_x,
      position_y,
      width,
      height
    ) VALUES (
      p_owner_id,
      p_nursery_id,
      v_widget.widget_type,
      v_widget.title,
      v_widget.data_config,
      v_widget.position_x,
      v_widget.position_y,
      v_widget.width,
      v_widget.height
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if widget cache is expired
CREATE OR REPLACE FUNCTION is_widget_cache_expired(
  p_widget_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT cache_expires_at
  INTO v_expires_at
  FROM dashboard_widget
  WHERE id = p_widget_id;

  RETURN v_expires_at IS NULL OR v_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update widget cache
CREATE OR REPLACE FUNCTION update_widget_cache(
  p_widget_id UUID,
  p_cached_data JSONB,
  p_ttl_minutes INT DEFAULT 15
)
RETURNS VOID AS $$
BEGIN
  UPDATE dashboard_widget
  SET
    cached_data = p_cached_data,
    cache_expires_at = NOW() + (p_ttl_minutes || ' minutes')::INTERVAL,
    last_refreshed_at = NOW()
  WHERE id = p_widget_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE dashboard_template IS 'Predefined dashboard templates for quick setup';
COMMENT ON TABLE dashboard_widget IS 'Customizable dashboard widgets for owners';
COMMENT ON COLUMN dashboard_widget.data_config IS 'Widget data source configuration in JSON format';
COMMENT ON COLUMN dashboard_widget.cached_data IS 'Cached widget data for fast loading';
COMMENT ON COLUMN dashboard_widget.position_x IS 'Widget X position in grid (0-based)';
COMMENT ON COLUMN dashboard_widget.position_y IS 'Widget Y position in grid (0-based)';
