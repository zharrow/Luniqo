-- ================================================
-- PHASE 1: PLAN D'ACCUEIL INDIVIDUALISÉ (PAI)
-- ================================================
-- Migration: 15_phase1_pai.sql
-- Description: Individual Care Plan for children with special needs
-- Tables: pai_document
-- ================================================

-- ============================================================
-- TABLE: pai_document
-- ============================================================
-- Individual Care Plan (PAI) for children with specific health needs
-- Requires signatures from doctor, guardian, and nursery director
-- Must be renewed annually
-- ============================================================

CREATE TABLE pai_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  pai_type VARCHAR(50) NOT NULL,  -- 'medical', 'allergy', 'disability', 'chronic_condition'

  condition_description TEXT NOT NULL,  -- Condition description
  emergency_protocol TEXT NOT NULL,  -- Detailed emergency protocol
  daily_care_protocol TEXT,  -- Daily care requirements

  medication_list TEXT,  -- Authorized medications
  medication_storage_instructions TEXT,  -- Medication storage instructions

  -- Associated documents
  medical_certificate_url TEXT,  -- Medical certificate (mandatory)
  prescription_url TEXT,  -- Prescription
  protocol_document_url TEXT,  -- Signed PAI document

  -- Signatures
  signed_by_doctor VARCHAR(255),
  doctor_signature_date DATE,
  signed_by_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  guardian_signature_date DATE,
  signed_by_director_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  director_signature_date DATE,

  -- Validity
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,  -- PAI must be renewed annually
  is_active BOOLEAN DEFAULT TRUE,

  -- Reviews
  last_review_date DATE,
  next_review_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_pai_child ON pai_document(child_id);
CREATE INDEX idx_pai_type ON pai_document(pai_type);
CREATE INDEX idx_pai_active ON pai_document(is_active);
CREATE INDEX idx_pai_end_date ON pai_document(end_date);

COMMENT ON TABLE pai_document IS 'Individual Care Plan (PAI) for children with special needs';
COMMENT ON COLUMN pai_document.pai_type IS 'Type: medical, allergy, disability, chronic_condition';
COMMENT ON COLUMN pai_document.condition_description IS 'Description of the medical condition';
COMMENT ON COLUMN pai_document.emergency_protocol IS 'Detailed emergency response protocol';
COMMENT ON COLUMN pai_document.daily_care_protocol IS 'Daily care requirements and procedures';
COMMENT ON COLUMN pai_document.medication_list IS 'List of authorized medications';
COMMENT ON COLUMN pai_document.medical_certificate_url IS 'Medical certificate (mandatory)';
COMMENT ON COLUMN pai_document.start_date IS 'PAI start date';
COMMENT ON COLUMN pai_document.end_date IS 'PAI end date (must renew annually)';

-- ============================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================

CREATE TRIGGER update_pai_document_updated_at
  BEFORE UPDATE ON pai_document
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CONSTRAINT: Ensure PAI end date is after start date
-- ============================================================

ALTER TABLE pai_document
  ADD CONSTRAINT check_pai_dates
  CHECK (end_date > start_date);

COMMENT ON CONSTRAINT check_pai_dates ON pai_document IS 'Ensure PAI end date is after start date';

-- ============================================================
-- END MIGRATION
-- ============================================================
