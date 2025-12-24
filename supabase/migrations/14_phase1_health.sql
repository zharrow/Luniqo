-- ================================================
-- PHASE 1: CHILD HEALTH RECORDS
-- ================================================
-- Migration: 14_phase1_health.sql
-- Description: Complete health records for children
-- Tables: child_health, child_allergy, child_diet, child_vaccination
-- ================================================

-- ============================================================
-- TABLE: child_health
-- ============================================================
-- General health record for a child (1:1 relationship)
-- ============================================================

CREATE TABLE child_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Medical history
  medical_history TEXT,  -- General medical history
  chronic_conditions TEXT,  -- Chronic illnesses
  disabilities TEXT,  -- Disabilities if any

  -- Practical information
  blood_type VARCHAR(10),  -- Blood type
  height_cm DECIMAL(5,2),  -- Height in cm
  weight_kg DECIMAL(5,2),  -- Weight in kg
  last_checkup_date DATE,  -- Last medical checkup

  -- Special needs
  needs_special_care BOOLEAN DEFAULT FALSE,
  special_care_notes TEXT,
  has_pai BOOLEAN DEFAULT FALSE,  -- Has Individual Care Plan

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  UNIQUE(child_id)  -- Only one health record per child
);

CREATE INDEX idx_child_health_child ON child_health(child_id);
CREATE INDEX idx_child_health_pai ON child_health(has_pai);

COMMENT ON TABLE child_health IS 'General health record for children';
COMMENT ON COLUMN child_health.medical_history IS 'General medical history';
COMMENT ON COLUMN child_health.chronic_conditions IS 'Chronic illnesses';
COMMENT ON COLUMN child_health.has_pai IS 'Has Individual Care Plan (PAI)';

-- ============================================================
-- TABLE: child_allergy
-- ============================================================
-- Detailed allergy records for a child
-- ============================================================

CREATE TABLE child_allergy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  allergy_type VARCHAR(50) NOT NULL,  -- 'food', 'respiratory', 'medication', 'contact', 'insect'
  allergen VARCHAR(255) NOT NULL,  -- Name of allergen (e.g., 'peanut', 'pollen', 'penicillin')

  severity VARCHAR(20) NOT NULL,  -- 'mild', 'moderate', 'severe', 'life_threatening'
  symptoms TEXT,  -- Observed symptoms
  treatment_protocol TEXT,  -- Treatment protocol in case of reaction

  requires_epipen BOOLEAN DEFAULT FALSE,  -- Requires EpiPen/Anapen

  diagnosed_date DATE,
  diagnosed_by VARCHAR(255),  -- Doctor name

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_allergy_child ON child_allergy(child_id);
CREATE INDEX idx_child_allergy_type ON child_allergy(allergy_type);
CREATE INDEX idx_child_allergy_severity ON child_allergy(severity);
CREATE INDEX idx_child_allergy_active ON child_allergy(is_active);

COMMENT ON TABLE child_allergy IS 'Detailed allergy records';
COMMENT ON COLUMN child_allergy.allergy_type IS 'Type: food, respiratory, medication, contact, insect';
COMMENT ON COLUMN child_allergy.severity IS 'Severity: mild, moderate, severe, life_threatening';
COMMENT ON COLUMN child_allergy.requires_epipen IS 'Requires EpiPen or Anapen';

-- ============================================================
-- TABLE: child_diet
-- ============================================================
-- Special diets and dietary restrictions
-- ============================================================

CREATE TABLE child_diet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  diet_type VARCHAR(50) NOT NULL,
  -- Types: 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free',
  --        'lactose_free', 'no_pork', 'texture_modified', 'pureed'

  reason VARCHAR(50),  -- 'allergy', 'intolerance', 'religious', 'ethical', 'medical', 'preference'

  description TEXT,  -- Diet details
  excluded_foods TEXT,  -- Foods to exclude
  alternative_foods TEXT,  -- Substitute foods

  requires_specific_menu BOOLEAN DEFAULT FALSE,

  start_date DATE NOT NULL,
  end_date DATE,  -- NULL = permanent diet

  prescribed_by VARCHAR(255),  -- Doctor/nutritionist name if medical

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_diet_child ON child_diet(child_id);
CREATE INDEX idx_child_diet_type ON child_diet(diet_type);
CREATE INDEX idx_child_diet_active ON child_diet(is_active);

COMMENT ON TABLE child_diet IS 'Special diets and dietary restrictions';
COMMENT ON COLUMN child_diet.diet_type IS 'Type: vegetarian, vegan, halal, gluten_free, etc.';
COMMENT ON COLUMN child_diet.reason IS 'Reason: allergy, intolerance, religious, ethical, medical';
COMMENT ON COLUMN child_diet.requires_specific_menu IS 'Requires a specific menu';

-- ============================================================
-- TABLE: child_vaccination
-- ============================================================
-- Complete vaccination record for a child
-- ============================================================

CREATE TABLE child_vaccination (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  vaccine_name VARCHAR(255) NOT NULL,  -- Vaccine name (e.g., 'DTPolio', 'MMR', 'BCG')
  vaccine_code VARCHAR(50),  -- ATC code or equivalent

  dose_number INTEGER,  -- Dose number (1, 2, 3, booster)
  administration_date DATE NOT NULL,
  next_dose_due_date DATE,  -- Next dose due date

  administered_by VARCHAR(255),  -- Healthcare professional name
  batch_number VARCHAR(100),  -- Batch number

  location VARCHAR(100),  -- Administration location (clinic, hospital, pharmacy)

  side_effects TEXT,  -- Observed side effects
  notes TEXT,

  document_url TEXT,  -- Vaccination record scan (Supabase Storage)

  is_mandatory BOOLEAN DEFAULT FALSE,  -- Mandatory in France
  is_up_to_date BOOLEAN DEFAULT TRUE,  -- Up to date according to schedule

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_vaccination_child ON child_vaccination(child_id);
CREATE INDEX idx_child_vaccination_name ON child_vaccination(vaccine_name);
CREATE INDEX idx_child_vaccination_next_due ON child_vaccination(next_dose_due_date);
CREATE INDEX idx_child_vaccination_status ON child_vaccination(is_up_to_date);

COMMENT ON TABLE child_vaccination IS 'Complete vaccination records';
COMMENT ON COLUMN child_vaccination.vaccine_name IS 'Vaccine name (DTPolio, MMR, BCG, etc.)';
COMMENT ON COLUMN child_vaccination.dose_number IS 'Dose number (1, 2, 3, booster)';
COMMENT ON COLUMN child_vaccination.is_mandatory IS 'Mandatory vaccination in France';
COMMENT ON COLUMN child_vaccination.is_up_to_date IS 'Up to date according to vaccination schedule';

-- ============================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================

CREATE TRIGGER update_child_health_updated_at
  BEFORE UPDATE ON child_health
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_allergy_updated_at
  BEFORE UPDATE ON child_allergy
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_diet_updated_at
  BEFORE UPDATE ON child_diet
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_vaccination_updated_at
  BEFORE UPDATE ON child_vaccination
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END MIGRATION
-- ============================================================
