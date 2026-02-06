-- ================================================
-- PHASE 1: CHILD DETAILS
-- ================================================
-- Migration: 13_phase1_child_details.sql
-- Description: Child photos, authorizations, emergency contacts, doctors, documents
-- Tables: child_photo, child_authorization, child_emergency_contact, child_doctor, child_document
-- ================================================

-- ============================================================
-- TABLE: child_photo
-- ============================================================
-- Photo gallery for each child (profile pictures and others)
-- ============================================================

CREATE TABLE child_photo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  file_url TEXT NOT NULL,  -- Supabase Storage URL
  file_name VARCHAR(255),
  file_size INTEGER,  -- Size in bytes
  mime_type VARCHAR(50),

  caption TEXT,
  taken_date DATE,

  is_profile_photo BOOLEAN DEFAULT FALSE,  -- Main profile photo
  is_visible_to_parents BOOLEAN DEFAULT TRUE,

  uploaded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_photo_child ON child_photo(child_id);
CREATE INDEX idx_child_photo_profile ON child_photo(is_profile_photo);

COMMENT ON TABLE child_photo IS 'Photo gallery for children';
COMMENT ON COLUMN child_photo.is_profile_photo IS 'Main profile photo';
COMMENT ON COLUMN child_photo.is_visible_to_parents IS 'Visible on parent portal';

-- ============================================================
-- TABLE: child_authorization
-- ============================================================
-- Various authorizations for a child (photos, outings, medication, etc.)
-- ============================================================

CREATE TABLE child_authorization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  authorization_type VARCHAR(50) NOT NULL,
  -- Types: 'photos', 'outings', 'swimming', 'nap', 'sunscreen',
  --        'diaper_cream', 'medication', 'first_aid', 'emergency_medical'

  is_authorized BOOLEAN DEFAULT FALSE,
  notes TEXT,  -- Special conditions

  valid_from DATE,
  valid_until DATE,  -- NULL = no expiration

  -- Signature traceability
  signed_by_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ,
  signature_url TEXT,  -- Electronic signature (Supabase Storage)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_child_auth_child ON child_authorization(child_id);
CREATE INDEX idx_child_auth_type ON child_authorization(authorization_type);
CREATE INDEX idx_child_auth_validity ON child_authorization(valid_from, valid_until);

COMMENT ON TABLE child_authorization IS 'Various authorizations for children';
COMMENT ON COLUMN child_authorization.authorization_type IS 'Type: photos, outings, swimming, medication, etc.';
COMMENT ON COLUMN child_authorization.signature_url IS 'URL to electronic signature';

-- ============================================================
-- TABLE: child_emergency_contact
-- ============================================================
-- Emergency contacts to call (other than parents)
-- ============================================================

CREATE TABLE child_emergency_contact (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50),  -- 'grandmother', 'uncle', 'neighbor', 'friend'

  phone_primary VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  email VARCHAR(255),

  can_pick_up BOOLEAN DEFAULT FALSE,  -- Authorized to pick up child
  priority_order INTEGER DEFAULT 1,  -- Call order (1 = highest priority)

  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_emergency_child ON child_emergency_contact(child_id);
CREATE INDEX idx_child_emergency_priority ON child_emergency_contact(priority_order);

COMMENT ON TABLE child_emergency_contact IS 'Emergency contacts (other than parents)';
COMMENT ON COLUMN child_emergency_contact.relationship IS 'Relationship: grandmother, uncle, neighbor, friend';
COMMENT ON COLUMN child_emergency_contact.can_pick_up IS 'Authorized to pick up the child';
COMMENT ON COLUMN child_emergency_contact.priority_order IS 'Call order (1 = first to call)';

-- ============================================================
-- TABLE: child_doctor
-- ============================================================
-- Child's doctor information (general practitioner, pediatrician, etc.)
-- ============================================================

CREATE TABLE child_doctor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  doctor_type VARCHAR(50) NOT NULL,  -- 'general_practitioner', 'pediatrician', 'specialist'
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(255),

  is_primary BOOLEAN DEFAULT TRUE,  -- Primary doctor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_doctor_child ON child_doctor(child_id);
CREATE INDEX idx_child_doctor_primary ON child_doctor(is_primary);

COMMENT ON TABLE child_doctor IS 'Child doctors (GP, pediatrician, specialists)';
COMMENT ON COLUMN child_doctor.doctor_type IS 'Type: general_practitioner, pediatrician, specialist';
COMMENT ON COLUMN child_doctor.is_primary IS 'Primary/main doctor';

-- ============================================================
-- TABLE: child_document
-- ============================================================
-- Administrative documents for child (birth certificate, vaccination record, etc.)
-- ============================================================

CREATE TABLE child_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  document_type VARCHAR(50) NOT NULL,
  -- Types: 'birth_certificate', 'vaccination_record', 'social_security',
  --        'insurance_certificate', 'residence_proof', 'work_certificate',
  --        'income_proof', 'caf_certificate', 'medical_certificate', 'pai'

  file_url TEXT NOT NULL,  -- Supabase Storage URL
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(50),

  issue_date DATE,  -- Document issue date
  expiry_date DATE,  -- Expiration date (if applicable)

  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'expired'
  reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  uploaded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_document_child ON child_document(child_id);
CREATE INDEX idx_child_document_type ON child_document(document_type);
CREATE INDEX idx_child_document_status ON child_document(status);
CREATE INDEX idx_child_document_expiry ON child_document(expiry_date);

COMMENT ON TABLE child_document IS 'Administrative documents for enrollment';
COMMENT ON COLUMN child_document.document_type IS 'Type: birth_certificate, vaccination_record, insurance, etc.';
COMMENT ON COLUMN child_document.status IS 'Status: pending, approved, rejected, expired';

-- ============================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================

CREATE TRIGGER update_child_authorization_updated_at
  BEFORE UPDATE ON child_authorization
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_emergency_contact_updated_at
  BEFORE UPDATE ON child_emergency_contact
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_doctor_updated_at
  BEFORE UPDATE ON child_doctor
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_document_updated_at
  BEFORE UPDATE ON child_document
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END MIGRATION
-- ============================================================
