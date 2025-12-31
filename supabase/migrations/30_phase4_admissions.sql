-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 30: Admissions
-- =====================================================
-- Created: 2025-12-29
-- Description: Processus d'admission (transition demande → enfant inscrit)

-- =====================================================
-- TABLE: admission (Admissions)
-- =====================================================

CREATE TABLE admission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL UNIQUE REFERENCES application(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  child_id UUID UNIQUE REFERENCES child(id) ON DELETE SET NULL,  -- Créé lors de l'admission
  family_id UUID REFERENCES family(id) ON DELETE SET NULL,

  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,                     -- Date d'entrée en crèche

  -- Affectation initiale
  section_id UUID REFERENCES section(id) ON DELETE SET NULL,
  room_id UUID REFERENCES room(id) ON DELETE SET NULL,

  -- Adaptation
  trial_period_weeks INTEGER DEFAULT 2,         -- Période d'adaptation (2 semaines par défaut)
  trial_period_end DATE,

  -- Statut
  status VARCHAR(20) DEFAULT 'pending',         -- 'pending', 'active', 'completed', 'cancelled'

  -- Traçabilité
  admitted_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_admission_nursery ON admission(nursery_id);
CREATE INDEX idx_admission_application ON admission(application_id);
CREATE INDEX idx_admission_child ON admission(child_id);
CREATE INDEX idx_admission_family ON admission(family_id);
CREATE INDEX idx_admission_status ON admission(status);
CREATE INDEX idx_admission_start_date ON admission(start_date);
CREATE INDEX idx_admission_section ON admission(section_id);
CREATE INDEX idx_admission_room ON admission(room_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Create family and child from application
CREATE OR REPLACE FUNCTION create_family_and_child_from_application(
  p_admission_id UUID
)
RETURNS TABLE (
  family_id UUID,
  child_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_admission RECORD;
  v_application RECORD;
  v_family_id UUID;
  v_child_id UUID;
  v_guardian1_id UUID;
  v_guardian2_id UUID;
BEGIN
  -- Get admission and application data
  SELECT a.*, app.*
  INTO v_admission
  FROM admission a
  JOIN application app ON app.id = a.application_id
  WHERE a.id = p_admission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admission not found: %', p_admission_id;
  END IF;

  -- Create family
  INSERT INTO family (
    nursery_id,
    family_name,
    address,
    postal_code,
    city,
    is_active
  )
  VALUES (
    v_admission.nursery_id,
    v_admission.parent1_last_name,
    v_admission.address,
    v_admission.postal_code,
    v_admission.city,
    TRUE
  )
  RETURNING id INTO v_family_id;

  -- Create guardian 1 (parent 1)
  INSERT INTO guardian (
    family_id,
    first_name,
    last_name,
    email,
    phone_mobile,
    is_primary_contact
  )
  VALUES (
    v_family_id,
    v_admission.parent1_first_name,
    v_admission.parent1_last_name,
    v_admission.parent1_email,
    v_admission.parent1_phone,
    TRUE
  )
  RETURNING id INTO v_guardian1_id;

  -- Create guardian 2 (parent 2) if provided
  IF v_admission.parent2_first_name IS NOT NULL THEN
    INSERT INTO guardian (
      family_id,
      first_name,
      last_name,
      email,
      phone_mobile,
      is_primary_contact
    )
    VALUES (
      v_family_id,
      v_admission.parent2_first_name,
      v_admission.parent2_last_name,
      v_admission.parent2_email,
      v_admission.parent2_phone,
      FALSE
    )
    RETURNING id INTO v_guardian2_id;
  END IF;

  -- Create child
  INSERT INTO child (
    nursery_id,
    family_id,
    first_name,
    last_name,
    birth_date,
    gender,
    admission_date,
    status
  )
  VALUES (
    v_admission.nursery_id,
    v_family_id,
    v_admission.child_first_name,
    v_admission.child_last_name,
    v_admission.child_birth_date,
    v_admission.child_gender,
    v_admission.start_date,
    'active'
  )
  RETURNING id INTO v_child_id;

  -- Assign section if provided
  IF v_admission.section_id IS NOT NULL THEN
    INSERT INTO child_section (
      child_id,
      section_id,
      start_date,
      is_current
    )
    VALUES (
      v_child_id,
      v_admission.section_id,
      v_admission.start_date,
      TRUE
    );
  END IF;

  -- Update admission with family_id and child_id
  UPDATE admission
  SET family_id = v_family_id,
      child_id = v_child_id,
      status = 'active',
      updated_at = NOW()
  WHERE id = p_admission_id;

  -- Update application status
  UPDATE application
  SET status = 'accepted'
  WHERE id = v_admission.application_id;

  -- Return created IDs
  RETURN QUERY SELECT v_family_id, v_child_id;
END;
$$;

-- Function: Calculate trial period end date
CREATE OR REPLACE FUNCTION calculate_trial_period_end(
  p_start_date DATE,
  p_trial_weeks INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN p_start_date + (p_trial_weeks * 7 || ' days')::INTERVAL;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: updated_at pour admission
CREATE TRIGGER update_admission_updated_at
  BEFORE UPDATE ON admission
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-calculate trial_period_end
CREATE OR REPLACE FUNCTION trigger_calculate_trial_end()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.trial_period_weeks IS NOT NULL THEN
    NEW.trial_period_end := calculate_trial_period_end(NEW.start_date, NEW.trial_period_weeks);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_trial_end_on_admission
  BEFORE INSERT OR UPDATE ON admission
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_trial_end();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE admission IS 'Admissions des enfants (transition demande → inscription effective)';
COMMENT ON COLUMN admission.status IS 'pending (en cours), active (admis), completed (terminé), cancelled';
COMMENT ON COLUMN admission.trial_period_weeks IS 'Durée période d''adaptation en semaines (généralement 2 semaines)';
COMMENT ON COLUMN admission.trial_period_end IS 'Date de fin période d''adaptation (calculée automatiquement)';

COMMENT ON FUNCTION create_family_and_child_from_application IS 'Crée automatiquement family, guardians et child à partir des données de la demande';
COMMENT ON FUNCTION calculate_trial_period_end IS 'Calcule la date de fin de période d''adaptation';
