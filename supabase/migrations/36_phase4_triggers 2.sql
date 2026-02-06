-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 36: Advanced Triggers
-- =====================================================
-- Created: 2025-12-29
-- Description: Triggers pour automatiser workflows et validations

-- =====================================================
-- APPLICATION TRIGGERS
-- =====================================================

-- Trigger: Auto-detect sibling priority
CREATE OR REPLACE FUNCTION auto_detect_sibling_priority()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_sibling BOOLEAN;
BEGIN
  -- Check if sibling exists
  v_has_sibling := check_sibling_enrolled(NEW.nursery_id, NEW.parent1_email);

  -- Add sibling priority if exists and not already added
  IF v_has_sibling THEN
    INSERT INTO application_priority (
      application_id,
      priority_type,
      priority_score,
      verified,
      notes
    )
    VALUES (
      NEW.id,
      'sibling',
      100,  -- High priority score for siblings
      TRUE,  -- Auto-verified
      'Auto-detected: Sibling already enrolled'
    )
    ON CONFLICT DO NOTHING;  -- Ignore if already exists
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER detect_sibling_on_application_create
  AFTER INSERT ON application
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_sibling_priority();

-- =====================================================
-- WAITING LIST TRIGGERS
-- =====================================================

-- Trigger: Auto-update application status when added to waiting list
CREATE OR REPLACE FUNCTION update_application_status_on_waiting_list()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE application
    SET status = 'waiting_list',
        updated_at = NOW()
    WHERE id = NEW.application_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' THEN
    UPDATE application
    SET status = 'accepted',
        updated_at = NOW()
    WHERE id = NEW.application_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'removed' THEN
    UPDATE application
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = NEW.application_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_application_status_with_waiting_list
  AFTER INSERT OR UPDATE ON waiting_list
  FOR EACH ROW
  EXECUTE FUNCTION update_application_status_on_waiting_list();

-- =====================================================
-- ADMISSION TRIGGERS
-- =====================================================

-- Trigger: Prevent duplicate admissions for same application
CREATE OR REPLACE FUNCTION prevent_duplicate_admission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_existing_count
  FROM admission
  WHERE application_id = NEW.application_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Admission already exists for this application';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_duplicate_admission
  BEFORE INSERT OR UPDATE ON admission
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_admission();

-- =====================================================
-- CONTRACT TRIGGERS
-- =====================================================

-- Trigger: Validate contract dates
CREATE OR REPLACE FUNCTION validate_contract_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- End date must be after start date
  IF NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'Contract end date must be after start date';
  END IF;

  -- Termination date must be >= start date
  IF NEW.termination_date IS NOT NULL AND NEW.termination_date < NEW.start_date THEN
    RAISE EXCEPTION 'Termination date cannot be before contract start date';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contract_dates_trigger
  BEFORE INSERT OR UPDATE ON contract
  FOR EACH ROW
  EXECUTE FUNCTION validate_contract_dates();

-- Trigger: Auto-activate contract when both signatures present
CREATE OR REPLACE FUNCTION auto_activate_contract_on_signatures()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only auto-activate if status is pending_signature
  IF NEW.status = 'pending_signature'
     AND NEW.guardian_signature_date IS NOT NULL
     AND NEW.guardian_signature_url IS NOT NULL
     AND NEW.director_signature_date IS NOT NULL
     AND NEW.director_signature_url IS NOT NULL THEN

    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER activate_contract_on_both_signatures
  BEFORE UPDATE ON contract
  FOR EACH ROW
  WHEN (OLD.status = 'pending_signature')
  EXECUTE FUNCTION auto_activate_contract_on_signatures();

-- Trigger: Prevent modifying active contract fields
CREATE OR REPLACE FUNCTION prevent_active_contract_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow status changes and termination fields
  IF OLD.status = 'active' AND NEW.status = 'active' THEN
    -- Prevent changing critical fields
    IF OLD.contract_number != NEW.contract_number
       OR OLD.child_id != NEW.child_id
       OR OLD.family_id != NEW.family_id
       OR OLD.start_date != NEW.start_date THEN

      RAISE EXCEPTION 'Cannot modify critical fields of an active contract. Create an amendment instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_active_contract
  BEFORE UPDATE ON contract
  FOR EACH ROW
  WHEN (OLD.status = 'active')
  EXECUTE FUNCTION prevent_active_contract_modification();

-- =====================================================
-- CONTRACT AMENDMENT TRIGGERS
-- =====================================================

-- Trigger: Auto-increment amendment number
CREATE OR REPLACE FUNCTION auto_increment_amendment_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_number INTEGER;
BEGIN
  IF NEW.amendment_number IS NULL THEN
    SELECT COALESCE(MAX(amendment_number), 0) + 1
    INTO v_max_number
    FROM contract_amendment
    WHERE contract_id = NEW.contract_id;

    NEW.amendment_number := v_max_number;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_amendment_number
  BEFORE INSERT ON contract_amendment
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_amendment_number();

-- Trigger: Apply amendment changes to contract when activated
CREATE OR REPLACE FUNCTION apply_amendment_to_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Apply rate changes
    IF NEW.new_hourly_rate IS NOT NULL THEN
      UPDATE contract
      SET hourly_rate = NEW.new_hourly_rate,
          updated_at = NOW()
      WHERE id = NEW.contract_id;
    END IF;

    IF NEW.new_monthly_rate IS NOT NULL THEN
      UPDATE contract
      SET monthly_rate = NEW.new_monthly_rate,
          updated_at = NOW()
      WHERE id = NEW.contract_id;
    END IF;

    -- Apply hours changes
    IF NEW.new_weekly_hours IS NOT NULL THEN
      UPDATE contract
      SET weekly_hours = NEW.new_weekly_hours,
          updated_at = NOW()
      WHERE id = NEW.contract_id;
    END IF;

    -- Note: Schedule changes (new_schedule JSONB) should be applied manually
    -- via application code to update contract_schedule table
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_active_amendment
  AFTER UPDATE ON contract_amendment
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION apply_amendment_to_contract();

-- =====================================================
-- RATE GRID TRIGGERS
-- =====================================================

-- Trigger: Ensure only one default grid per type per nursery
CREATE OR REPLACE FUNCTION ensure_single_default_rate_grid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    -- Unset other defaults for same nursery and type
    UPDATE rate_grid
    SET is_default = FALSE,
        updated_at = NOW()
    WHERE nursery_id = NEW.nursery_id
      AND grid_type = NEW.grid_type
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER maintain_single_default_grid
  AFTER INSERT OR UPDATE ON rate_grid
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_rate_grid();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION auto_detect_sibling_priority IS 'Détecte automatiquement si un frère/sœur est déjà inscrit et ajoute la priorité';
COMMENT ON FUNCTION update_application_status_on_waiting_list IS 'Synchronise le statut de l''application avec la liste d''attente';
COMMENT ON FUNCTION prevent_duplicate_admission IS 'Empêche la création de plusieurs admissions pour la même demande';
COMMENT ON FUNCTION validate_contract_dates IS 'Valide la cohérence des dates du contrat';
COMMENT ON FUNCTION auto_activate_contract_on_signatures IS 'Active automatiquement le contrat quand les deux signatures sont présentes';
COMMENT ON FUNCTION prevent_active_contract_modification IS 'Empêche la modification de champs critiques d''un contrat actif';
COMMENT ON FUNCTION auto_increment_amendment_number IS 'Incrémente automatiquement le numéro d''avenant';
COMMENT ON FUNCTION apply_amendment_to_contract IS 'Applique les modifications de l''avenant au contrat quand activé';
COMMENT ON FUNCTION ensure_single_default_rate_grid IS 'Assure qu''il n''y a qu''une seule grille par défaut par type et par crèche';
