-- ================================================
-- PHASE 1: DOSSIER ENFANT & FAMILLES - CORE TABLES
-- ================================================
-- Migration: 10_phase1_core.sql
-- Description: Core tables for family and guardian management
-- Tables: family, guardian, guardian_child, guardian_address, guardian_user
-- ================================================

-- ============================================================
-- TABLE: family
-- ============================================================
-- Represents the household/family unit
-- One family can have multiple children and multiple guardians
-- ============================================================

CREATE TABLE family (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Family information
  family_name VARCHAR(255) NOT NULL,
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(255),
  country VARCHAR(100) DEFAULT 'France',

  -- Family situation
  family_situation VARCHAR(50),  -- 'married', 'divorced', 'single_parent', 'separated', 'cohabitation'
  number_of_children INTEGER DEFAULT 1,

  -- Socio-economic information (for PSU rate calculation)
  annual_income DECIMAL(10,2),
  caf_number VARCHAR(50),  -- CAF allocataire number

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  UNIQUE(nursery_id, caf_number)
);

CREATE INDEX idx_family_nursery ON family(nursery_id);
CREATE INDEX idx_family_active ON family(is_active);

COMMENT ON TABLE family IS 'Represents family units for childcare management';
COMMENT ON COLUMN family.family_situation IS 'Family situation: married, divorced, single_parent, separated, cohabitation';
COMMENT ON COLUMN family.annual_income IS 'Annual household income for PSU rate calculation';
COMMENT ON COLUMN family.caf_number IS 'CAF allocataire number (unique per nursery)';

-- ============================================================
-- TABLE: guardian
-- ============================================================
-- Represents parents and legal guardians
-- Multiple guardians can belong to one family
-- Multiple guardians can be linked to multiple children (M2M)
-- ============================================================

CREATE TABLE guardian (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,

  -- Identity
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone_primary VARCHAR(20),
  phone_secondary VARCHAR(20),

  -- Legal status
  legal_responsibility VARCHAR(50) NOT NULL,  -- 'parent', 'legal_guardian', 'emergency_contact'
  relationship_to_child VARCHAR(50),  -- 'mother', 'father', 'grandmother', 'uncle', etc.
  has_custody BOOLEAN DEFAULT TRUE,
  can_pick_up BOOLEAN DEFAULT TRUE,

  -- Professional information (for PSU justification)
  employer_name VARCHAR(255),
  employer_address TEXT,
  employer_phone VARCHAR(20),
  profession VARCHAR(255),
  work_certificate_date DATE,

  -- Contact preferences
  preferred_contact_method VARCHAR(20),  -- 'email', 'sms', 'phone'
  notification_enabled BOOLEAN DEFAULT TRUE,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(family_id, email)
);

CREATE INDEX idx_guardian_family ON guardian(family_id);
CREATE INDEX idx_guardian_email ON guardian(email);
CREATE INDEX idx_guardian_active ON guardian(is_active);

COMMENT ON TABLE guardian IS 'Parents and legal guardians';
COMMENT ON COLUMN guardian.legal_responsibility IS 'Type: parent, legal_guardian, emergency_contact';
COMMENT ON COLUMN guardian.relationship_to_child IS 'Relationship: mother, father, grandmother, uncle, etc.';
COMMENT ON COLUMN guardian.has_custody IS 'Has legal custody of the child';
COMMENT ON COLUMN guardian.can_pick_up IS 'Authorized to pick up the child';

-- ============================================================
-- TABLE: guardian_child
-- ============================================================
-- Many-to-many relationship between guardians and children
-- Allows multiple guardians for one child (divorced parents, etc.)
-- ============================================================

CREATE TABLE guardian_child (
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Relationship specifics
  relationship VARCHAR(50),  -- 'mother', 'father', 'legal_guardian', etc.
  is_primary_contact BOOLEAN DEFAULT FALSE,
  can_authorize_medical BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (guardian_id, child_id)
);

CREATE INDEX idx_guardian_child_guardian ON guardian_child(guardian_id);
CREATE INDEX idx_guardian_child_child ON guardian_child(child_id);

COMMENT ON TABLE guardian_child IS 'Many-to-many relationship between guardians and children';
COMMENT ON COLUMN guardian_child.is_primary_contact IS 'Primary contact for this child';
COMMENT ON COLUMN guardian_child.can_authorize_medical IS 'Can authorize medical procedures';

-- ============================================================
-- TABLE: guardian_address
-- ============================================================
-- Separate addresses for guardians (if different from family address)
-- Used for separated/divorced parents with different addresses
-- ============================================================

CREATE TABLE guardian_address (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,

  address_type VARCHAR(20) NOT NULL,  -- 'home', 'work', 'alternate'
  address TEXT NOT NULL,
  postal_code VARCHAR(10),
  city VARCHAR(255),
  country VARCHAR(100) DEFAULT 'France',

  is_billing_address BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guardian_address_guardian ON guardian_address(guardian_id);

COMMENT ON TABLE guardian_address IS 'Separate addresses for guardians (custody arrangements)';
COMMENT ON COLUMN guardian_address.address_type IS 'Type: home, work, alternate';
COMMENT ON COLUMN guardian_address.is_billing_address IS 'Use for billing';
COMMENT ON COLUMN guardian_address.is_primary IS 'Primary address for this guardian';

-- ============================================================
-- TABLE: guardian_user
-- ============================================================
-- Links guardians to Supabase Auth users for parent portal access
-- Allows guardians to log in and view their child's information
-- ============================================================

CREATE TABLE guardian_user (
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Portal access rights
  can_view_photos BOOLEAN DEFAULT TRUE,
  can_receive_messages BOOLEAN DEFAULT TRUE,
  can_update_info BOOLEAN DEFAULT FALSE,

  -- Terms acceptance
  terms_accepted_at TIMESTAMPTZ,
  privacy_policy_accepted_at TIMESTAMPTZ,

  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (guardian_id, user_id)
);

CREATE INDEX idx_guardian_user_guardian ON guardian_user(guardian_id);
CREATE INDEX idx_guardian_user_user ON guardian_user(user_id);

COMMENT ON TABLE guardian_user IS 'Links guardians to auth.users for parent portal access';
COMMENT ON COLUMN guardian_user.can_view_photos IS 'Can view child photos on portal';
COMMENT ON COLUMN guardian_user.can_receive_messages IS 'Can receive messages from nursery';
COMMENT ON COLUMN guardian_user.can_update_info IS 'Can update child information';

-- ============================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_family_updated_at
  BEFORE UPDATE ON family
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardian_updated_at
  BEFORE UPDATE ON guardian
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardian_address_updated_at
  BEFORE UPDATE ON guardian_address
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END MIGRATION
-- ============================================================
