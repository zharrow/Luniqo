-- =====================================================
-- Migration 69: Barcode Scanning & Product Lifecycle
-- =====================================================
-- Description: Add barcode support to products and lifecycle tracking to batches
-- Features:
--   - Product barcode (EAN-13) with Open Food Facts integration
--   - Product brand and image from OFF
--   - Batch expiry date (DLC) tracking
--   - Batch opening date tracking
--   - Batch lifecycle status (sealed -> opened -> consumed/expired/discarded)
-- Date: 2026-02-03
-- =====================================================

-- ========================================
-- PRODUCT TABLE: Barcode & Brand
-- ========================================

-- Barcode (EAN-13, EAN-8, UPC-A, etc.)
ALTER TABLE product ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

-- Brand name (from Open Food Facts or manual input)
ALTER TABLE product ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Product image URL (from Open Food Facts)
ALTER TABLE product ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Index for barcode lookups
CREATE INDEX IF NOT EXISTS idx_product_barcode ON product(barcode);

-- Unique barcode per nursery (same product can exist in different nurseries)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_barcode_nursery
  ON product(nursery_id, barcode) WHERE barcode IS NOT NULL;

-- ========================================
-- BATCH TABLE: Lifecycle Tracking
-- ========================================

-- Expiry date (DLC - Date Limite de Consommation)
ALTER TABLE batch ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Date when the product was opened
ALTER TABLE batch ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Lifecycle status: sealed, opened, consumed, expired, discarded
ALTER TABLE batch ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sealed';

-- Updated at timestamp
ALTER TABLE batch ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Who received the batch
ALTER TABLE batch ADD COLUMN IF NOT EXISTS received_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Allow batch_code to be nullable (barcode-scanned products may not have a lot number)
ALTER TABLE batch ALTER COLUMN batch_code DROP NOT NULL;

-- Set existing batches to 'sealed' status
UPDATE batch SET status = 'sealed' WHERE status IS NULL;

-- Indexes for batch queries
CREATE INDEX IF NOT EXISTS idx_batch_expiry_date ON batch(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batch_status ON batch(status);
CREATE INDEX IF NOT EXISTS idx_batch_product_id ON batch(product_id);

-- Comments
COMMENT ON COLUMN product.barcode IS 'EAN-13/EAN-8/UPC barcode from product packaging';
COMMENT ON COLUMN product.brand IS 'Product brand name';
COMMENT ON COLUMN product.image_url IS 'Product image URL (from Open Food Facts)';
COMMENT ON COLUMN batch.expiry_date IS 'DLC - Date Limite de Consommation';
COMMENT ON COLUMN batch.opened_at IS 'Date when the product was opened';
COMMENT ON COLUMN batch.status IS 'Lifecycle status: sealed, opened, consumed, expired, discarded';
COMMENT ON COLUMN batch.received_by_id IS 'Employee who received the batch';

-- ========================================
-- SUMMARY
-- ========================================
-- Product table:
--   + barcode VARCHAR(50) - EAN barcode
--   + brand VARCHAR(255) - Product brand
--   + image_url TEXT - Product image
--   + Unique index (nursery_id, barcode)
-- Batch table:
--   + expiry_date DATE - DLC
--   + opened_at TIMESTAMPTZ - Opening date
--   + status VARCHAR(20) - Lifecycle status
--   + updated_at TIMESTAMPTZ - Last update
--   + received_by_id UUID - Who received it
--   ~ batch_code now nullable
