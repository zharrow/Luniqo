-- =====================================================================================
-- Phase 7: Statistiques & Analyses - Analytics Events
-- =====================================================================================
-- Description: Event tracking for analytics and anomaly detection
-- Tables: analytics_event
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

-- Event categories
CREATE TYPE analytics_event_category AS ENUM (
  'ENROLLMENT',         -- Child enrollment events (new, departure)
  'FINANCIAL',          -- Financial events (payment, invoice, overdue)
  'STAFF',              -- Staff events (hire, termination, absence)
  'HACCP',              -- HACCP events (incident, non-compliance)
  'OCCUPANCY',          -- Occupancy events (capacity reached, low occupancy)
  'PARENT_ENGAGEMENT',  -- Parent portal events (login, message, feedback)
  'CONTRACT',           -- Contract events (new, renewal, termination)
  'SYSTEM'              -- System events (anomaly detected, threshold reached)
);

-- Event severity levels
CREATE TYPE event_severity AS ENUM (
  'INFO',      -- Informational event
  'WARNING',   -- Warning - requires attention
  'CRITICAL',  -- Critical - requires immediate action
  'SUCCESS'    -- Positive event
);

-- =====================================================================================
-- TABLE: analytics_event
-- =====================================================================================
-- Tracks important business events for analytics and pattern detection

CREATE TABLE analytics_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  triggered_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Event metadata
  category analytics_event_category NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- Specific event (e.g., "NEW_CONTRACT", "PAYMENT_OVERDUE")
  severity event_severity DEFAULT 'INFO',

  -- Event description
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Event data (flexible JSON structure)
  event_data JSONB DEFAULT '{}'::jsonb,
  -- Structure examples:
  -- NEW_CONTRACT: { "child_id": "uuid", "contract_type": "PSU", "monthly_amount": 850.00 }
  -- PAYMENT_OVERDUE: { "invoice_id": "uuid", "amount": 1200.00, "days_overdue": 15 }
  -- HACCP_INCIDENT: { "incident_id": "uuid", "incident_type": "TEMPERATURE", "severity": "MAJOR" }

  -- Related entities (for quick filtering)
  related_child_id UUID REFERENCES child(id) ON DELETE SET NULL,
  related_staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
  related_contract_id UUID REFERENCES contract(id) ON DELETE SET NULL,

  -- Analytics metadata
  is_anomaly BOOLEAN DEFAULT FALSE, -- Flagged as anomaly by detection algorithm
  anomaly_score DECIMAL(5, 2), -- 0-100 score indicating anomaly severity
  is_resolved BOOLEAN DEFAULT FALSE, -- Whether event has been addressed
  resolved_at TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Notification tracking
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,

  -- Timestamps
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Primary lookup: Get events for a nursery by date
CREATE INDEX idx_analytics_event_nursery_date
ON analytics_event(nursery_id, event_timestamp DESC);

-- Filter by category
CREATE INDEX idx_analytics_event_category
ON analytics_event(nursery_id, category, event_timestamp DESC);

-- Filter by event type
CREATE INDEX idx_analytics_event_type
ON analytics_event(nursery_id, event_type, event_timestamp DESC);

-- Filter by severity
CREATE INDEX idx_analytics_event_severity
ON analytics_event(nursery_id, severity, event_timestamp DESC)
WHERE severity IN ('WARNING', 'CRITICAL');

-- Find unresolved events
CREATE INDEX idx_analytics_event_unresolved
ON analytics_event(nursery_id, is_resolved, event_timestamp DESC)
WHERE is_resolved = FALSE;

-- Find anomalies
CREATE INDEX idx_analytics_event_anomalies
ON analytics_event(nursery_id, is_anomaly, anomaly_score DESC)
WHERE is_anomaly = TRUE;

-- Related entity lookups
CREATE INDEX idx_analytics_event_child
ON analytics_event(related_child_id, event_timestamp DESC)
WHERE related_child_id IS NOT NULL;

CREATE INDEX idx_analytics_event_staff
ON analytics_event(related_staff_id, event_timestamp DESC)
WHERE related_staff_id IS NOT NULL;

CREATE INDEX idx_analytics_event_invoice
ON analytics_event(related_invoice_id, event_timestamp DESC)
WHERE related_invoice_id IS NOT NULL;

CREATE INDEX idx_analytics_event_contract
ON analytics_event(related_contract_id, event_timestamp DESC)
WHERE related_contract_id IS NOT NULL;

-- JSONB event_data queries (GIN index for fast JSON searches)
CREATE INDEX idx_analytics_event_data
ON analytics_event USING GIN(event_data);

-- Date range queries (for trend analysis)
CREATE INDEX idx_analytics_event_date_range
ON analytics_event(event_timestamp DESC, nursery_id);

-- Notification tracking
CREATE INDEX idx_analytics_event_notification_pending
ON analytics_event(notification_sent, event_timestamp DESC)
WHERE notification_sent = FALSE AND severity IN ('WARNING', 'CRITICAL');

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

ALTER TABLE analytics_event ENABLE ROW LEVEL SECURITY;

-- Owners can view events for their nurseries
CREATE POLICY analytics_event_owner_select
ON analytics_event FOR SELECT
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

-- System can insert events (automated tracking)
CREATE POLICY analytics_event_system_insert
ON analytics_event FOR INSERT
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

-- Owners can update events (mark as resolved)
CREATE POLICY analytics_event_owner_update
ON analytics_event FOR UPDATE
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

-- Function to create an analytics event
CREATE OR REPLACE FUNCTION create_analytics_event(
  p_nursery_id UUID,
  p_category analytics_event_category,
  p_event_type VARCHAR,
  p_title VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_severity event_severity DEFAULT 'INFO',
  p_event_data JSONB DEFAULT '{}'::jsonb,
  p_triggered_by_id UUID DEFAULT NULL,
  p_related_child_id UUID DEFAULT NULL,
  p_related_staff_id UUID DEFAULT NULL,
  p_related_invoice_id UUID DEFAULT NULL,
  p_related_contract_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_event (
    nursery_id,
    category,
    event_type,
    title,
    description,
    severity,
    event_data,
    triggered_by_id,
    related_child_id,
    related_staff_id,
    related_invoice_id,
    related_contract_id
  ) VALUES (
    p_nursery_id,
    p_category,
    p_event_type,
    p_title,
    p_description,
    p_severity,
    p_event_data,
    p_triggered_by_id,
    p_related_child_id,
    p_related_staff_id,
    p_related_invoice_id,
    p_related_contract_id
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark event as resolved
CREATE OR REPLACE FUNCTION resolve_analytics_event(
  p_event_id UUID,
  p_resolved_by_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE analytics_event
  SET
    is_resolved = TRUE,
    resolved_at = NOW(),
    resolved_by_id = p_resolved_by_id
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get unresolved events count by category
CREATE OR REPLACE FUNCTION get_unresolved_events_count(
  p_nursery_id UUID
)
RETURNS TABLE (
  category analytics_event_category,
  severity event_severity,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.category,
    ae.severity,
    COUNT(*) as event_count
  FROM analytics_event ae
  WHERE ae.nursery_id = p_nursery_id
    AND ae.is_resolved = FALSE
  GROUP BY ae.category, ae.severity
  ORDER BY
    CASE ae.severity
      WHEN 'CRITICAL' THEN 1
      WHEN 'WARNING' THEN 2
      WHEN 'INFO' THEN 3
      WHEN 'SUCCESS' THEN 4
    END,
    ae.category;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent anomalies
CREATE OR REPLACE FUNCTION get_recent_anomalies(
  p_nursery_id UUID,
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  category analytics_event_category,
  event_type VARCHAR,
  title VARCHAR,
  anomaly_score DECIMAL,
  event_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.category,
    ae.event_type,
    ae.title,
    ae.anomaly_score,
    ae.event_timestamp
  FROM analytics_event ae
  WHERE ae.nursery_id = p_nursery_id
    AND ae.is_anomaly = TRUE
    AND ae.event_timestamp >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY ae.anomaly_score DESC, ae.event_timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get event timeline (for visualization)
CREATE OR REPLACE FUNCTION get_event_timeline(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_category analytics_event_category DEFAULT NULL
)
RETURNS TABLE (
  event_date DATE,
  category analytics_event_category,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ae.event_timestamp) as event_date,
    ae.category,
    COUNT(*) as event_count
  FROM analytics_event ae
  WHERE ae.nursery_id = p_nursery_id
    AND DATE(ae.event_timestamp) BETWEEN p_start_date AND p_end_date
    AND (p_category IS NULL OR ae.category = p_category)
  GROUP BY DATE(ae.event_timestamp), ae.category
  ORDER BY event_date DESC, ae.category;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC EVENT TRACKING
-- =====================================================================================

-- Auto-create event when new contract is created
CREATE OR REPLACE FUNCTION track_new_contract_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_analytics_event(
    NEW.nursery_id,
    'CONTRACT'::analytics_event_category,
    'NEW_CONTRACT',
    'Nouveau contrat signé',
    'Contrat ' || NEW.contract_type || ' pour ' || NEW.monthly_base_amount || '€/mois',
    'SUCCESS'::event_severity,
    jsonb_build_object(
      'contract_id', NEW.id,
      'contract_type', NEW.contract_type,
      'monthly_amount', NEW.monthly_base_amount,
      'child_id', NEW.child_id
    ),
    NULL, -- triggered_by_id (set by application)
    NEW.child_id,
    NULL, NULL, NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_new_contract
AFTER INSERT ON contract
FOR EACH ROW
EXECUTE FUNCTION track_new_contract_event();

-- Auto-create event when invoice becomes overdue (>30 days)
CREATE OR REPLACE FUNCTION track_overdue_invoice_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to overdue
  IF NEW.status = 'overdue' AND (OLD.status IS NULL OR OLD.status != 'overdue') THEN
    PERFORM create_analytics_event(
      (SELECT c.nursery_id FROM contract c WHERE c.id = NEW.contract_id),
      'FINANCIAL'::analytics_event_category,
      'INVOICE_OVERDUE',
      'Facture impayée',
      'Facture #' || NEW.invoice_number || ' en retard de paiement',
      'WARNING'::event_severity,
      jsonb_build_object(
        'invoice_id', NEW.id,
        'invoice_number', NEW.invoice_number,
        'amount', NEW.total_amount,
        'due_date', NEW.due_date,
        'days_overdue', EXTRACT(DAY FROM (NOW() - NEW.due_date))
      ),
      NULL,
      (SELECT c.child_id FROM contract c WHERE c.id = NEW.contract_id),
      NULL,
      NEW.id,
      NEW.contract_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_overdue_invoice
AFTER UPDATE ON invoice
FOR EACH ROW
WHEN (NEW.status = 'overdue')
EXECUTE FUNCTION track_overdue_invoice_event();

-- Auto-create event for HACCP incidents
CREATE OR REPLACE FUNCTION track_haccp_incident_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_analytics_event(
    NEW.nursery_id,
    'HACCP'::analytics_event_category,
    'HACCP_INCIDENT',
    'Incident HACCP - ' || NEW.incident_type,
    NEW.description,
    CASE NEW.severity
      WHEN 'CRITICAL' THEN 'CRITICAL'::event_severity
      WHEN 'MAJOR' THEN 'WARNING'::event_severity
      ELSE 'INFO'::event_severity
    END,
    jsonb_build_object(
      'incident_id', NEW.id,
      'incident_type', NEW.incident_type,
      'severity', NEW.severity
    ),
    NEW.reported_by_id,
    NULL,
    NEW.reported_by_id,
    NULL, NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_haccp_incident
AFTER INSERT ON haccp_incident
FOR EACH ROW
EXECUTE FUNCTION track_haccp_incident_event();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE analytics_event IS 'Business events for analytics and anomaly detection';
COMMENT ON COLUMN analytics_event.event_data IS 'Event details in JSON format';
COMMENT ON COLUMN analytics_event.is_anomaly IS 'Flagged as anomaly by detection algorithm';
COMMENT ON COLUMN analytics_event.anomaly_score IS 'Anomaly severity score (0-100)';
COMMENT ON COLUMN analytics_event.is_resolved IS 'Whether event has been addressed by an owner';
