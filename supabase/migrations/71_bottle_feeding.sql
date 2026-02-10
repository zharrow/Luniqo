-- ============================================================================
-- BOTTLE FEEDING TRACEABILITY
-- Migration 71: Bottle feeding records for HACCP compliance
-- Version: 1.0 (2026-02-10)
-- ============================================================================

-- ============================================================================
-- BOTTLE FEEDING TABLE
-- Records each bottle feeding event for HACCP traceability
-- ============================================================================
CREATE TABLE bottle_feeding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Location
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Who was fed
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- What milk was used (optional - for traceability)
  product_id UUID REFERENCES product(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES batch(id) ON DELETE SET NULL,

  -- Feeding details
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'mL',
  fed_at TIMESTAMPTZ NOT NULL,

  -- Who gave the bottle (signature)
  fed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: feedings by nursery and date
CREATE INDEX idx_bottle_feeding_nursery_date ON bottle_feeding(nursery_id, fed_at DESC);

-- Child-specific queries
CREATE INDEX idx_bottle_feeding_child ON bottle_feeding(child_id);

-- Date range queries
CREATE INDEX idx_bottle_feeding_date ON bottle_feeding(fed_at);

-- Product traceability
CREATE INDEX idx_bottle_feeding_product ON bottle_feeding(product_id);
CREATE INDEX idx_bottle_feeding_batch ON bottle_feeding(batch_id);

-- Employee lookup
CREATE INDEX idx_bottle_feeding_fed_by ON bottle_feeding(fed_by_id);

-- ============================================================================
-- TRIGGER: Auto-update timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_bottle_feeding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bottle_feeding_updated
  BEFORE UPDATE ON bottle_feeding
  FOR EACH ROW
  EXECUTE FUNCTION update_bottle_feeding_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE bottle_feeding IS 'Records of bottle feedings for HACCP traceability - Traçabilité de la consommation des biberons';
COMMENT ON COLUMN bottle_feeding.quantity IS 'Amount of milk consumed';
COMMENT ON COLUMN bottle_feeding.unit IS 'Unit of measurement (mL by default)';
COMMENT ON COLUMN bottle_feeding.fed_at IS 'Exact timestamp when the feeding occurred';
COMMENT ON COLUMN bottle_feeding.fed_by_id IS 'Employee who gave the bottle (signature)';
