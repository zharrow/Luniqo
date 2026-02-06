-- =====================================================
-- PHASE 3: PERSONNEL & PLANNING RH - DOCUMENTS
-- Migration: 22_phase3_documents.sql
-- Description: HR documents management
-- Tables: staff_document
-- =====================================================

-- =====================================================
-- TABLE: staff_document
-- Description: HR documents for staff (contracts, ID, certificates, etc.)
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Document type
  document_type VARCHAR(50) NOT NULL,
  -- Types: 'id_card', 'resume', 'work_permit', 'social_security', 'rib',
  --        'criminal_record', 'medical_certificate', 'contract', 'amendment',
  --        'performance_review', 'warning_letter', 'termination_letter'

  -- File details
  file_url TEXT NOT NULL,  -- Supabase Storage URL
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(50),

  -- Document dates
  issue_date DATE,
  expiry_date DATE,

  -- Review status
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'expired'
  reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Confidentiality
  is_confidential BOOLEAN DEFAULT TRUE,  -- HR only by default

  -- Who uploaded
  uploaded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_file_size_positive CHECK (file_size IS NULL OR file_size > 0),
  CONSTRAINT chk_issue_date_before_expiry CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date > issue_date),
  CONSTRAINT chk_reviewed_requires_reviewer CHECK (
    (status = 'pending') OR
    (status != 'pending' AND reviewed_by_id IS NOT NULL)
  )
);

-- Indexes for staff_document
CREATE INDEX idx_staff_document_employee ON staff_document(employee_id);
CREATE INDEX idx_staff_document_type ON staff_document(document_type);
CREATE INDEX idx_staff_document_status ON staff_document(status);
CREATE INDEX idx_staff_document_expiry ON staff_document(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_staff_document_confidential ON staff_document(is_confidential);
CREATE INDEX idx_staff_document_created_at ON staff_document(created_at DESC);

-- Composite index for filtering expired documents
CREATE INDEX idx_staff_document_expired ON staff_document(employee_id, expiry_date, status)
  WHERE expiry_date IS NOT NULL AND status != 'expired';

-- Comments
COMMENT ON TABLE staff_document IS 'HR documents for staff members (contracts, certificates, ID cards, etc.)';
COMMENT ON COLUMN staff_document.document_type IS 'Type of document: id_card, resume, work_permit, social_security, rib, criminal_record, medical_certificate, contract, amendment, performance_review, warning_letter, termination_letter';
COMMENT ON COLUMN staff_document.status IS 'Document status: pending (awaiting review), approved, rejected, expired';
COMMENT ON COLUMN staff_document.is_confidential IS 'Whether this document is confidential (accessible only to HR/management)';
COMMENT ON COLUMN staff_document.file_url IS 'URL to the document file in Supabase Storage';

-- =====================================================
-- FUNCTION: Automatically mark expired documents
-- =====================================================

CREATE OR REPLACE FUNCTION check_expired_staff_documents()
RETURNS void AS $$
BEGIN
  UPDATE staff_document
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE
    AND status != 'expired';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_expired_staff_documents IS 'Automatically marks staff documents as expired when their expiry date has passed';

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_staff_document_updated_at ON staff_document;
CREATE TRIGGER update_staff_document_updated_at
  BEFORE UPDATE ON staff_document
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
