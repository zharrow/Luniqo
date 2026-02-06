-- =====================================================
-- Migration 20: Phase 2 - Indices et Optimisations
-- =====================================================
-- Description: Indices complémentaires et vues pour performances
-- =====================================================

-- =====================================================
-- Indices Complémentaires pour Requêtes Fréquentes
-- =====================================================

-- Recherches de journée complète enfant (vue timeline)
CREATE INDEX IF NOT EXISTS idx_meal_log_child_date_time ON child_meal_log(child_id, date, meal_time);
CREATE INDEX IF NOT EXISTS idx_sleep_log_child_date_start ON child_sleep_log(child_id, date, sleep_start_time);
CREATE INDEX IF NOT EXISTS idx_change_log_child_date_time ON child_change_log(child_id, date, time);

-- Recherches par statut et date (rapports présences)
CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance(date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_nursery_status ON attendance(nursery_id, status);

-- Recherches activités futures/passées
CREATE INDEX IF NOT EXISTS idx_activity_nursery_date_status ON activity(nursery_id, planned_date, status);

-- Observations récentes par catégorie
CREATE INDEX IF NOT EXISTS idx_observation_child_category_date ON child_observation(child_id, category, observation_date DESC);


-- =====================================================
-- Vues Utiles pour Rapports
-- =====================================================

-- Vue: Présences du jour par crèche
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT
  a.nursery_id,
  a.date,
  a.status,
  COUNT(DISTINCT a.child_id) as child_count,
  SUM(a.total_hours) as total_hours,
  AVG(a.total_hours) as avg_hours_per_child
FROM attendance a
GROUP BY a.nursery_id, a.date, a.status;

COMMENT ON VIEW daily_attendance_summary IS 'Résumé quotidien des présences par crèche et statut';


-- Vue: Journal complet enfant (timeline journée)
CREATE OR REPLACE VIEW child_daily_timeline AS
SELECT
  c.id as child_id,
  c.nursery_id,
  'attendance' as event_type,
  a.date as event_date,
  a.actual_arrival_time::TEXT as event_time,
  'Arrivée' as event_description,
  a.checked_in_by_id as logged_by_id,
  a.created_at
FROM child c
LEFT JOIN attendance a ON a.child_id = c.id

UNION ALL

SELECT
  c.id,
  c.nursery_id,
  'meal',
  ml.date,
  ml.meal_time::TEXT,
  ml.meal_type || ' - ' || ml.appetite,
  ml.logged_by_id,
  ml.created_at
FROM child c
LEFT JOIN child_meal_log ml ON ml.child_id = c.id

UNION ALL

SELECT
  c.id,
  c.nursery_id,
  'sleep',
  sl.date,
  sl.sleep_start_time::TEXT,
  'Sieste (' || COALESCE(sl.duration_minutes::TEXT, '?') || ' min)',
  sl.logged_by_id,
  sl.created_at
FROM child c
LEFT JOIN child_sleep_log sl ON sl.child_id = c.id

UNION ALL

SELECT
  c.id,
  c.nursery_id,
  'change',
  cl.date,
  cl.time::TEXT,
  'Change - ' || cl.change_type,
  cl.changed_by_id,
  cl.created_at
FROM child c
LEFT JOIN child_change_log cl ON cl.child_id = c.id

UNION ALL

SELECT
  c.id,
  c.nursery_id,
  'observation',
  co.observation_date,
  COALESCE(co.observation_time::TEXT, ''),
  'Observation - ' || co.category,
  co.observed_by_id,
  co.created_at
FROM child c
LEFT JOIN child_observation co ON co.child_id = c.id

ORDER BY event_date DESC, event_time DESC;

COMMENT ON VIEW child_daily_timeline IS 'Timeline complète de la journée d''un enfant (tous événements)';


-- Vue: Statistiques activités par catégorie
CREATE OR REPLACE VIEW activity_statistics AS
SELECT
  a.nursery_id,
  a.category,
  a.age_group,
  COUNT(a.id) as total_activities,
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_count,
  AVG(a.duration_minutes) as avg_duration_minutes,
  COUNT(DISTINCT ap.child_id) as total_children_participated
FROM activity a
LEFT JOIN activity_participation ap ON ap.activity_id = a.id
GROUP BY a.nursery_id, a.category, a.age_group;

COMMENT ON VIEW activity_statistics IS 'Statistiques des activités par catégorie et tranche d''âge';


-- Vue: Observations par enfant et catégorie
CREATE OR REPLACE VIEW child_observation_summary AS
SELECT
  co.child_id,
  co.category,
  COUNT(co.id) as observation_count,
  COUNT(CASE WHEN co.milestone_achieved THEN 1 END) as milestones_achieved,
  MAX(co.observation_date) as last_observation_date,
  COUNT(CASE WHEN co.follow_up_needed THEN 1 END) as follow_ups_needed
FROM child_observation co
GROUP BY co.child_id, co.category;

COMMENT ON VIEW child_observation_summary IS 'Résumé des observations par enfant et domaine de développement';


-- =====================================================
-- Fonctions Utilitaires
-- =====================================================

-- Fonction: Obtenir toutes les présences d'une semaine
CREATE OR REPLACE FUNCTION get_weekly_attendance(
  p_nursery_id UUID,
  p_start_date DATE
)
RETURNS TABLE (
  child_id UUID,
  child_name TEXT,
  monday_status VARCHAR,
  tuesday_status VARCHAR,
  wednesday_status VARCHAR,
  thursday_status VARCHAR,
  friday_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.first_name || ' ' || c.last_name,
    MAX(CASE WHEN EXTRACT(DOW FROM a.date) = 1 THEN a.status END),
    MAX(CASE WHEN EXTRACT(DOW FROM a.date) = 2 THEN a.status END),
    MAX(CASE WHEN EXTRACT(DOW FROM a.date) = 3 THEN a.status END),
    MAX(CASE WHEN EXTRACT(DOW FROM a.date) = 4 THEN a.status END),
    MAX(CASE WHEN EXTRACT(DOW FROM a.date) = 5 THEN a.status END)
  FROM child c
  LEFT JOIN attendance a ON a.child_id = c.id
    AND a.date BETWEEN p_start_date AND p_start_date + INTERVAL '6 days'
  WHERE c.nursery_id = p_nursery_id
    AND c.is_active = TRUE
  GROUP BY c.id, c.first_name, c.last_name
  ORDER BY c.last_name, c.first_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_weekly_attendance IS 'Retourne un tableau récapitulatif des présences sur une semaine';


-- Fonction: Statistiques journée enfant
CREATE OR REPLACE FUNCTION get_child_day_stats(
  p_child_id UUID,
  p_date DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'attendance', (
      SELECT json_build_object(
        'status', status,
        'arrival_time', actual_arrival_time,
        'departure_time', actual_departure_time,
        'total_hours', total_hours
      )
      FROM attendance
      WHERE child_id = p_child_id AND date = p_date
    ),
    'meals', (
      SELECT json_agg(json_build_object(
        'time', meal_time,
        'type', meal_type,
        'appetite', appetite,
        'quantity', quantity_eaten
      ))
      FROM child_meal_log
      WHERE child_id = p_child_id AND date = p_date
    ),
    'sleeps', (
      SELECT json_agg(json_build_object(
        'start', sleep_start_time,
        'end', sleep_end_time,
        'duration_minutes', duration_minutes,
        'quality', sleep_quality
      ))
      FROM child_sleep_log
      WHERE child_id = p_child_id AND date = p_date
    ),
    'changes', (
      SELECT json_agg(json_build_object(
        'time', time,
        'type', change_type,
        'skin_condition', skin_condition
      ))
      FROM child_change_log
      WHERE child_id = p_child_id AND date = p_date
    ),
    'observations', (
      SELECT json_agg(json_build_object(
        'category', category,
        'description', description,
        'milestone_achieved', milestone_achieved
      ))
      FROM child_observation
      WHERE child_id = p_child_id AND observation_date = p_date
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_child_day_stats IS 'Retourne JSON avec toutes les données de la journée d''un enfant';


-- =====================================================
-- Contraintes d'Intégrité Supplémentaires
-- =====================================================

-- Vérifier que check_in et check_out référencent bien le même enfant
CREATE OR REPLACE FUNCTION validate_check_in_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_child_id UUID;
BEGIN
  SELECT child_id INTO v_child_id FROM attendance WHERE id = NEW.attendance_id;

  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'attendance_id invalide';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_check_in
  BEFORE INSERT ON check_in
  FOR EACH ROW
  EXECUTE FUNCTION validate_check_in_attendance();

CREATE TRIGGER trigger_validate_check_out
  BEFORE INSERT ON check_out
  FOR EACH ROW
  EXECUTE FUNCTION validate_check_in_attendance();


-- =====================================================
-- Fin Migration 20
-- =====================================================
