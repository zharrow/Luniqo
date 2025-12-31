-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 35: Business Logic Functions
-- =====================================================
-- Created: 2025-12-29
-- Description: Fonctions métier pour inscriptions et contrats

-- =====================================================
-- APPLICATION FUNCTIONS
-- =====================================================

-- Function: Get applications summary for nursery
CREATE OR REPLACE FUNCTION get_applications_summary(p_nursery_id UUID)
RETURNS TABLE (
  total_applications BIGINT,
  received BIGINT,
  under_review BIGINT,
  waiting_list BIGINT,
  accepted BIGINT,
  rejected BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_applications,
    COUNT(*) FILTER (WHERE status = 'received')::BIGINT AS received,
    COUNT(*) FILTER (WHERE status = 'under_review')::BIGINT AS under_review,
    COUNT(*) FILTER (WHERE status = 'waiting_list')::BIGINT AS waiting_list,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT AS accepted,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT AS rejected
  FROM application
  WHERE nursery_id = p_nursery_id;
END;
$$;

-- Function: Check if sibling already enrolled
CREATE OR REPLACE FUNCTION check_sibling_enrolled(
  p_nursery_id UUID,
  p_parent_email VARCHAR(255)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_sibling_count INTEGER;
BEGIN
  -- Check if any guardian with this email has children enrolled
  SELECT COUNT(DISTINCT c.id)
  INTO v_sibling_count
  FROM child c
  JOIN family f ON f.id = c.family_id
  JOIN guardian g ON g.family_id = f.id
  WHERE c.nursery_id = p_nursery_id
    AND g.email = p_parent_email
    AND c.status = 'active';

  RETURN v_sibling_count > 0;
END;
$$;

-- =====================================================
-- WAITING LIST FUNCTIONS
-- =====================================================

-- Function: Get next in line from waiting list
CREATE OR REPLACE FUNCTION get_next_in_waiting_list(p_nursery_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_waiting_list_id UUID;
BEGIN
  SELECT id
  INTO v_waiting_list_id
  FROM waiting_list
  WHERE nursery_id = p_nursery_id
    AND status = 'active'
    AND NOT notified_of_spot_available
  ORDER BY position ASC
  LIMIT 1;

  RETURN v_waiting_list_id;
END;
$$;

-- Function: Notify next applicant
CREATE OR REPLACE FUNCTION notify_next_applicant(
  p_nursery_id UUID,
  p_response_deadline_days INTEGER DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_waiting_list_id UUID;
BEGIN
  -- Get next in line
  v_waiting_list_id := get_next_in_waiting_list(p_nursery_id);

  IF v_waiting_list_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Mark as notified
  UPDATE waiting_list
  SET notified_of_spot_available = TRUE,
      notified_at = NOW(),
      response_deadline = CURRENT_DATE + (p_response_deadline_days || ' days')::INTERVAL,
      status = 'offered',
      updated_at = NOW()
  WHERE id = v_waiting_list_id;

  RETURN v_waiting_list_id;
END;
$$;

-- =====================================================
-- CONTRACT FUNCTIONS
-- =====================================================

-- Function: Get contracts summary for nursery
CREATE OR REPLACE FUNCTION get_contracts_summary(p_nursery_id UUID)
RETURNS TABLE (
  total_contracts BIGINT,
  draft BIGINT,
  pending_signature BIGINT,
  active BIGINT,
  suspended BIGINT,
  terminated BIGINT,
  expiring_soon BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_contracts,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT AS draft,
    COUNT(*) FILTER (WHERE status = 'pending_signature')::BIGINT AS pending_signature,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active,
    COUNT(*) FILTER (WHERE status = 'suspended')::BIGINT AS suspended,
    COUNT(*) FILTER (WHERE status = 'terminated')::BIGINT AS terminated,
    COUNT(*) FILTER (WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= CURRENT_DATE + INTERVAL '30 days')::BIGINT AS expiring_soon
  FROM contract
  WHERE nursery_id = p_nursery_id;
END;
$$;

-- Function: Activate contract (both signatures present)
CREATE OR REPLACE FUNCTION activate_contract(p_contract_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_guardian_signed BOOLEAN;
  v_director_signed BOOLEAN;
BEGIN
  -- Check if both signatures are present
  SELECT
    (guardian_signature_date IS NOT NULL AND guardian_signature_url IS NOT NULL),
    (director_signature_date IS NOT NULL AND director_signature_url IS NOT NULL)
  INTO v_guardian_signed, v_director_signed
  FROM contract
  WHERE id = p_contract_id;

  IF v_guardian_signed AND v_director_signed THEN
    UPDATE contract
    SET status = 'active',
        updated_at = NOW()
    WHERE id = p_contract_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Function: Terminate contract
CREATE OR REPLACE FUNCTION terminate_contract(
  p_contract_id UUID,
  p_termination_reason VARCHAR(50),
  p_termination_date DATE DEFAULT CURRENT_DATE,
  p_notice_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE contract
  SET status = 'terminated',
      termination_date = p_termination_date,
      termination_reason = p_termination_reason,
      termination_notice_date = COALESCE(p_notice_date, p_termination_date),
      updated_at = NOW()
  WHERE id = p_contract_id;
END;
$$;

-- =====================================================
-- RATE CALCULATION FUNCTIONS
-- =====================================================

-- Function: Calculate monthly cost from hourly rate and schedule
CREATE OR REPLACE FUNCTION calculate_monthly_cost(
  p_hourly_rate DECIMAL(6,2),
  p_weekly_hours DECIMAL(5,2),
  p_weeks_per_month DECIMAL(3,1) DEFAULT 4.33
)
RETURNS DECIMAL(8,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_monthly_cost DECIMAL(8,2);
BEGIN
  v_monthly_cost := ROUND(p_hourly_rate * p_weekly_hours * p_weeks_per_month, 2);
  RETURN v_monthly_cost;
END;
$$;

-- Function: Calculate family share with CAF participation
CREATE OR REPLACE FUNCTION calculate_family_share_psu(
  p_contract_id UUID,
  p_family_annual_income DECIMAL(10,2)
)
RETURNS TABLE (
  total_hourly_rate DECIMAL(6,2),
  caf_hourly_rate DECIMAL(6,2),
  family_hourly_rate DECIMAL(6,2),
  total_monthly_cost DECIMAL(8,2),
  caf_monthly_portion DECIMAL(8,2),
  family_monthly_portion DECIMAL(8,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract RECORD;
  v_rate_grid RECORD;
  v_bracket_rate DECIMAL(6,2);
  v_psu_rates RECORD;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contract
  WHERE id = p_contract_id;

  -- Get rate grid
  SELECT * INTO v_rate_grid
  FROM rate_grid
  WHERE nursery_id = v_contract.nursery_id
    AND grid_type = 'psu'
    AND is_active = TRUE
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY is_default DESC, valid_from DESC
  LIMIT 1;

  -- Find bracket rate
  v_bracket_rate := find_rate_for_income(v_rate_grid.id, p_family_annual_income);

  -- Calculate PSU rates with CAF participation
  SELECT * INTO v_psu_rates
  FROM calculate_psu_rate_with_caf(
    v_rate_grid.psu_base_rate,
    v_rate_grid.psu_caf_participation_rate,
    (SELECT psu_coefficient FROM rate_income_bracket WHERE rate_grid_id = v_rate_grid.id AND hourly_rate = v_bracket_rate LIMIT 1)
  );

  -- Return calculated rates
  RETURN QUERY
  SELECT
    v_psu_rates.total_rate,
    v_psu_rates.caf_portion,
    v_psu_rates.family_portion,
    calculate_monthly_cost(v_psu_rates.total_rate, v_contract.weekly_hours),
    calculate_monthly_cost(v_psu_rates.caf_portion, v_contract.weekly_hours),
    calculate_monthly_cost(v_psu_rates.family_portion, v_contract.weekly_hours);
END;
$$;

-- =====================================================
-- STATISTICS FUNCTIONS
-- =====================================================

-- Function: Get enrollment statistics by age group
CREATE OR REPLACE FUNCTION get_enrollment_stats_by_age(p_nursery_id UUID)
RETURNS TABLE (
  age_group VARCHAR(20),
  count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN EXTRACT(YEAR FROM AGE(c.birth_date)) < 1 THEN '0-1 year'
      WHEN EXTRACT(YEAR FROM AGE(c.birth_date)) < 2 THEN '1-2 years'
      WHEN EXTRACT(YEAR FROM AGE(c.birth_date)) < 3 THEN '2-3 years'
      ELSE '3+ years'
    END AS age_group,
    COUNT(*)::BIGINT
  FROM child c
  JOIN contract ct ON ct.child_id = c.id
  WHERE c.nursery_id = p_nursery_id
    AND ct.status = 'active'
  GROUP BY age_group
  ORDER BY age_group;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_applications_summary IS 'Résumé des demandes d''inscription par statut';
COMMENT ON FUNCTION check_sibling_enrolled IS 'Vérifie si un enfant de la même famille (même email parent) est déjà inscrit';
COMMENT ON FUNCTION get_next_in_waiting_list IS 'Récupère le prochain dans la liste d''attente';
COMMENT ON FUNCTION notify_next_applicant IS 'Notifie le prochain applicant qu''une place est disponible';
COMMENT ON FUNCTION get_contracts_summary IS 'Résumé des contrats par statut';
COMMENT ON FUNCTION activate_contract IS 'Active un contrat si les deux signatures sont présentes';
COMMENT ON FUNCTION terminate_contract IS 'Résilie un contrat avec raison et dates';
COMMENT ON FUNCTION calculate_monthly_cost IS 'Calcule le coût mensuel à partir du tarif horaire et des heures hebdomadaires';
COMMENT ON FUNCTION calculate_family_share_psu IS 'Calcule la répartition CAF/Famille pour un contrat PSU';
COMMENT ON FUNCTION get_enrollment_stats_by_age IS 'Statistiques d''inscription par tranche d''âge';
