-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 34: Database Views
-- =====================================================
-- Created: 2025-12-29
-- Description: Vues pour simplifier les requêtes fréquentes

-- =====================================================
-- VIEW: active_applications (Applications en cours de traitement)
-- =====================================================

CREATE OR REPLACE VIEW active_applications AS
SELECT
  a.*,
  n.name AS nursery_name,
  COALESCE(SUM(ap.priority_score), 0) AS total_priority_score,
  COUNT(ap.id) AS priority_count,
  wl.position AS waiting_list_position,
  wl.status AS waiting_list_status
FROM application a
JOIN nursery n ON n.id = a.nursery_id
LEFT JOIN application_priority ap ON ap.application_id = a.id AND ap.verified = TRUE
LEFT JOIN waiting_list wl ON wl.application_id = a.id
WHERE a.status IN ('received', 'under_review', 'waiting_list')
GROUP BY a.id, n.name, wl.position, wl.status;

-- =====================================================
-- VIEW: waiting_list_overview (Vue d'ensemble liste d'attente)
-- =====================================================

CREATE OR REPLACE VIEW waiting_list_overview AS
SELECT
  wl.*,
  a.child_first_name,
  a.child_last_name,
  a.child_birth_date,
  a.parent1_first_name,
  a.parent1_last_name,
  a.parent1_email,
  a.parent1_phone,
  a.desired_start_date,
  a.desired_contract_type,
  n.name AS nursery_name,
  (CURRENT_DATE - wl.added_to_list_date)::INTEGER AS days_on_list,
  CASE
    WHEN wl.response_deadline IS NOT NULL AND CURRENT_DATE > wl.response_deadline THEN TRUE
    ELSE FALSE
  END AS response_overdue
FROM waiting_list wl
JOIN application a ON a.id = wl.application_id
JOIN nursery n ON n.id = wl.nursery_id
WHERE wl.status = 'active'
ORDER BY wl.position ASC;

-- =====================================================
-- VIEW: active_contracts_overview (Contrats actifs avec détails)
-- =====================================================

CREATE OR REPLACE VIEW active_contracts_overview AS
SELECT
  c.*,
  f.family_name,
  ch.first_name AS child_first_name,
  ch.last_name AS child_last_name,
  ch.birth_date AS child_birth_date,
  EXTRACT(YEAR FROM AGE(ch.birth_date))::INTEGER AS child_age_years,
  g.first_name AS guardian_first_name,
  g.last_name AS guardian_last_name,
  g.email AS guardian_email,
  g.phone_primary AS guardian_phone,
  n.name AS nursery_name,
  CASE
    WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN TRUE
    ELSE FALSE
  END AS expiring_soon,
  (c.end_date - CURRENT_DATE)::INTEGER AS days_until_end
FROM contract c
JOIN family f ON f.id = c.family_id
JOIN child ch ON ch.id = c.child_id
JOIN nursery n ON n.id = c.nursery_id
LEFT JOIN guardian g ON g.id = c.signed_by_guardian_id
WHERE c.status = 'active';

-- =====================================================
-- VIEW: contract_schedule_summary (Résumé horaires contractuels)
-- =====================================================

CREATE OR REPLACE VIEW contract_schedule_summary AS
SELECT
  cs.contract_id,
  c.contract_number,
  c.child_id,
  ch.first_name AS child_first_name,
  ch.last_name AS child_last_name,
  COUNT(CASE WHEN cs.is_present THEN 1 END) AS days_per_week,
  SUM(CASE WHEN cs.is_present THEN cs.daily_hours ELSE 0 END) AS total_weekly_hours,
  jsonb_agg(
    jsonb_build_object(
      'day_of_week', cs.day_of_week,
      'is_present', cs.is_present,
      'arrival_time', cs.arrival_time,
      'departure_time', cs.departure_time,
      'daily_hours', cs.daily_hours
    ) ORDER BY cs.day_of_week
  ) AS schedule_details
FROM contract_schedule cs
JOIN contract c ON c.id = cs.contract_id
JOIN child ch ON ch.id = c.child_id
GROUP BY cs.contract_id, c.contract_number, c.child_id, ch.first_name, ch.last_name;

-- =====================================================
-- VIEW: admissions_in_progress (Admissions en cours)
-- =====================================================

CREATE OR REPLACE VIEW admissions_in_progress AS
SELECT
  ad.*,
  a.child_first_name,
  a.child_last_name,
  a.child_birth_date,
  a.parent1_first_name,
  a.parent1_last_name,
  a.parent1_email,
  a.parent1_phone,
  n.name AS nursery_name,
  s.name AS section_name,
  r.name AS room_name,
  p.first_name AS admitted_by_first_name,
  p.last_name AS admitted_by_last_name,
  (ad.start_date - CURRENT_DATE)::INTEGER AS days_until_start,
  CASE
    WHEN ad.start_date <= CURRENT_DATE THEN TRUE
    ELSE FALSE
  END AS has_started,
  CASE
    WHEN ad.trial_period_end IS NOT NULL AND CURRENT_DATE <= ad.trial_period_end THEN TRUE
    ELSE FALSE
  END AS in_trial_period
FROM admission ad
JOIN application a ON a.id = ad.application_id
JOIN nursery n ON n.id = ad.nursery_id
LEFT JOIN section s ON s.id = ad.section_id
LEFT JOIN room r ON r.id = ad.room_id
LEFT JOIN profiles p ON p.id = ad.admitted_by_id
WHERE ad.status IN ('pending', 'active');

-- =====================================================
-- VIEW: rate_grids_with_brackets (Grilles tarifaires avec tranches)
-- =====================================================

CREATE OR REPLACE VIEW rate_grids_with_brackets AS
SELECT
  rg.*,
  n.name AS nursery_name,
  COUNT(rib.id) AS bracket_count,
  MIN(rib.income_min) AS min_income,
  MAX(rib.income_max) AS max_income,
  MIN(rib.hourly_rate) AS min_hourly_rate,
  MAX(rib.hourly_rate) AS max_hourly_rate,
  jsonb_agg(
    jsonb_build_object(
      'id', rib.id,
      'bracket_name', rib.bracket_name,
      'income_min', rib.income_min,
      'income_max', rib.income_max,
      'hourly_rate', rib.hourly_rate,
      'psu_coefficient', rib.psu_coefficient
    ) ORDER BY rib.display_order, rib.income_min
  ) AS brackets
FROM rate_grid rg
JOIN nursery n ON n.id = rg.nursery_id
LEFT JOIN rate_income_bracket rib ON rib.rate_grid_id = rg.id
GROUP BY rg.id, n.name;

-- =====================================================
-- GRANT PERMISSIONS (if RLS is enabled)
-- =====================================================

-- Grant SELECT to authenticated users (adjust based on your RLS policies)
-- GRANT SELECT ON active_applications TO authenticated;
-- GRANT SELECT ON waiting_list_overview TO authenticated;
-- GRANT SELECT ON active_contracts_overview TO authenticated;
-- GRANT SELECT ON contract_schedule_summary TO authenticated;
-- GRANT SELECT ON admissions_in_progress TO authenticated;
-- GRANT SELECT ON rate_grids_with_brackets TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON VIEW active_applications IS 'Applications en cours de traitement avec priorités et position liste d''attente';
COMMENT ON VIEW waiting_list_overview IS 'Vue d''ensemble de la liste d''attente avec informations enfant et famille';
COMMENT ON VIEW active_contracts_overview IS 'Contrats actifs avec détails enfant, famille et échéances';
COMMENT ON VIEW contract_schedule_summary IS 'Résumé des horaires contractuels hebdomadaires par contrat';
COMMENT ON VIEW admissions_in_progress IS 'Admissions en cours avec détails et statut période d''adaptation';
COMMENT ON VIEW rate_grids_with_brackets IS 'Grilles tarifaires avec tranches de revenus agrégées';
