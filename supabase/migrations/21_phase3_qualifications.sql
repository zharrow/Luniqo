-- =====================================================
-- PHASE 3: PERSONNEL & PLANNING RH - QUALIFICATIONS
-- Migration: 21_phase3_qualifications.sql
-- Description: Staff qualifications and professional authorizations
-- Tables: staff_qualification, staff_authorization
-- =====================================================

-- =====================================================
-- TABLE: staff_qualification
-- Description: Professional qualifications, diplomas, certifications
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_qualification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type and name
  qualification_type VARCHAR(50) NOT NULL,
  -- Types: 'diploma', 'certification', 'training', 'first_aid', 'cpr',
  --        'food_safety', 'child_protection', 'management'
  qualification_name VARCHAR(255) NOT NULL,
  -- Ex: 'CAP Petite Enfance', 'Auxiliaire de puériculture', 'EJE', 'PSC1', 'HACCP'

  -- Issuer details
  issuing_organization VARCHAR(255),
  issue_date DATE NOT NULL,
  expiry_date DATE,

  -- Certificate details
  certificate_number VARCHAR(100),
  document_url TEXT,  -- Scan of diploma/certificate (Supabase Storage)

  -- Level
  qualification_level VARCHAR(20),  -- 'CAP', 'BEP', 'BAC', 'BAC+2', 'BAC+3', 'BAC+5'

  -- Verification status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  -- Active status
  is_active BOOLEAN DEFAULT TRUE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_issue_date_before_expiry CHECK (expiry_date IS NULL OR expiry_date > issue_date)
);

-- Indexes for staff_qualification
CREATE INDEX idx_staff_qualification_employee ON staff_qualification(employee_id);
CREATE INDEX idx_staff_qualification_type ON staff_qualification(qualification_type);
CREATE INDEX idx_staff_qualification_expiry ON staff_qualification(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_staff_qualification_active ON staff_qualification(is_active);
CREATE INDEX idx_staff_qualification_verified ON staff_qualification(is_verified);

-- Comments
COMMENT ON TABLE staff_qualification IS 'Professional qualifications and certifications for staff members';
COMMENT ON COLUMN staff_qualification.qualification_type IS 'Type of qualification: diploma, certification, training, first_aid, cpr, food_safety, child_protection, management';
COMMENT ON COLUMN staff_qualification.qualification_name IS 'Full name of the qualification (e.g., CAP AEPE, Auxiliaire de puériculture, EJE, PSC1)';
COMMENT ON COLUMN staff_qualification.qualification_level IS 'Educational level: CAP, BEP, BAC, BAC+2, BAC+3, BAC+5';
COMMENT ON COLUMN staff_qualification.is_verified IS 'Whether the qualification has been verified by management';

-- =====================================================
-- TABLE: staff_authorization
-- Description: Specific authorizations and permissions for staff
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_authorization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Authorization type
  authorization_type VARCHAR(50) NOT NULL,
  -- Types: 'administer_medication', 'first_aid', 'emergency_response',
  --        'open_facility', 'close_facility', 'handle_cash',
  --        'access_confidential', 'supervise_staff', 'sign_documents'

  -- Validity period
  granted_date DATE NOT NULL,
  expiry_date DATE,  -- NULL = no expiration

  -- Who granted
  granted_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Revocation
  revoked BOOLEAN DEFAULT FALSE,
  revoked_date DATE,
  revoked_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  revocation_reason TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_granted_date_before_expiry CHECK (expiry_date IS NULL OR expiry_date > granted_date),
  CONSTRAINT chk_revoked_date_after_granted CHECK (revoked_date IS NULL OR revoked_date >= granted_date),
  CONSTRAINT chk_revoked_requires_date CHECK ((NOT revoked) OR (revoked AND revoked_date IS NOT NULL))
);

-- Indexes for staff_authorization
CREATE INDEX idx_staff_authorization_employee ON staff_authorization(employee_id);
CREATE INDEX idx_staff_authorization_nursery ON staff_authorization(nursery_id);
CREATE INDEX idx_staff_authorization_type ON staff_authorization(authorization_type);
CREATE INDEX idx_staff_authorization_revoked ON staff_authorization(revoked);
CREATE INDEX idx_staff_authorization_active ON staff_authorization(employee_id, nursery_id, revoked)
  WHERE NOT revoked;

-- Comments
COMMENT ON TABLE staff_authorization IS 'Professional authorizations and permissions granted to staff members';
COMMENT ON COLUMN staff_authorization.authorization_type IS 'Type of authorization: administer_medication, first_aid, emergency_response, open_facility, close_facility, etc.';
COMMENT ON COLUMN staff_authorization.granted_by_id IS 'The manager/owner who granted this authorization';
COMMENT ON COLUMN staff_authorization.revoked IS 'Whether this authorization has been revoked';

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for staff_qualification
DROP TRIGGER IF EXISTS update_staff_qualification_updated_at ON staff_qualification;
CREATE TRIGGER update_staff_qualification_updated_at
  BEFORE UPDATE ON staff_qualification
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for staff_authorization
DROP TRIGGER IF EXISTS update_staff_authorization_updated_at ON staff_authorization;
CREATE TRIGGER update_staff_authorization_updated_at
  BEFORE UPDATE ON staff_authorization
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
