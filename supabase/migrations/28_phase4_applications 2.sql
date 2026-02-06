-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 28: Applications & Application Priority
-- =====================================================
-- Created: 2025-12-29
-- Description: Demandes d'inscription et critères de priorisation

-- =====================================================
-- TABLE: application (Demandes d'inscription)
-- =====================================================

CREATE TABLE application (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Informations enfant (temporaires avant création Child)
  child_first_name VARCHAR(100) NOT NULL,
  child_last_name VARCHAR(100) NOT NULL,
  child_birth_date DATE NOT NULL,
  child_gender VARCHAR(10),

  -- Informations famille (temporaires avant création Family)
  parent1_first_name VARCHAR(100) NOT NULL,
  parent1_last_name VARCHAR(100) NOT NULL,
  parent1_email VARCHAR(255) NOT NULL,
  parent1_phone VARCHAR(20) NOT NULL,

  parent2_first_name VARCHAR(100),
  parent2_last_name VARCHAR(100),
  parent2_email VARCHAR(255),
  parent2_phone VARCHAR(20),

  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(255),

  -- Demande
  desired_start_date DATE NOT NULL,
  desired_contract_type VARCHAR(50),            -- 'regular', 'occasional', 'emergency'
  desired_schedule TEXT,                        -- Description horaires souhaités

  -- Motivation
  motivation_letter TEXT,
  special_needs TEXT,                           -- Besoins spéciaux

  -- Statut
  status VARCHAR(20) DEFAULT 'received',        -- 'received', 'under_review', 'accepted', 'rejected', 'waiting_list', 'cancelled'
  application_date DATE DEFAULT CURRENT_DATE,

  reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Documents attachés (avant dossier complet)
  documents_urls TEXT[],

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: application_priority (Critères de priorisation)
-- =====================================================

CREATE TABLE application_priority (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES application(id) ON DELETE CASCADE,

  priority_type VARCHAR(50) NOT NULL,           -- Type de priorité
  -- Types: 'sibling', 'single_parent', 'special_needs', 'employee_child',
  --        'local_resident', 'low_income', 'military', 'manual_override'

  priority_score INTEGER DEFAULT 0,             -- Score numérique (cumul)

  evidence_document_url TEXT,                   -- Document justificatif
  verified BOOLEAN DEFAULT FALSE,
  verified_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Application indexes
CREATE INDEX idx_application_nursery ON application(nursery_id);
CREATE INDEX idx_application_status ON application(status);
CREATE INDEX idx_application_date ON application(application_date);
CREATE INDEX idx_application_start_date ON application(desired_start_date);
CREATE INDEX idx_application_parent1_email ON application(parent1_email);
CREATE INDEX idx_application_child_name ON application(child_last_name, child_first_name);

-- Application priority indexes
CREATE INDEX idx_application_priority_application ON application_priority(application_id);
CREATE INDEX idx_application_priority_type ON application_priority(priority_type);
CREATE INDEX idx_application_priority_verified ON application_priority(verified);

-- =====================================================
-- FULL-TEXT SEARCH
-- =====================================================

-- Full-text search on application (parents names, child name)
CREATE INDEX idx_application_fts ON application
USING gin(to_tsvector('french',
  coalesce(child_first_name, '') || ' ' ||
  coalesce(child_last_name, '') || ' ' ||
  coalesce(parent1_first_name, '') || ' ' ||
  coalesce(parent1_last_name, '') || ' ' ||
  coalesce(parent2_first_name, '') || ' ' ||
  coalesce(parent2_last_name, '')
));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: updated_at pour application
CREATE TRIGGER update_application_updated_at
  BEFORE UPDATE ON application
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE application IS 'Demandes de pré-inscription à la crèche';
COMMENT ON TABLE application_priority IS 'Critères de priorisation des demandes (fratrie, famille monoparentale, etc.)';

COMMENT ON COLUMN application.status IS 'received, under_review, accepted, rejected, waiting_list, cancelled';
COMMENT ON COLUMN application.desired_contract_type IS 'regular (régulier), occasional (occasionnel), emergency (urgence)';
COMMENT ON COLUMN application_priority.priority_type IS 'sibling (fratrie), single_parent, special_needs, employee_child, local_resident, low_income, military, manual_override';
COMMENT ON COLUMN application_priority.priority_score IS 'Score numérique de priorité (cumulable)';
