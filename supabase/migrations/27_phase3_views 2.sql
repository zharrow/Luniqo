-- =====================================================
-- PHASE 3: PERSONNEL & PLANNING RH - VIEWS
-- Migration: 27_phase3_views.sql
-- Description: Database views for reporting and analytics
-- =====================================================

-- =====================================================
-- VIEW: staff_overview
-- Description: Complete overview of staff with qualifications and assignments
-- =====================================================

CREATE OR REPLACE VIEW staff_overview AS
SELECT
  p.id AS employee_id,
  p.email,
  p.first_name,
  p.last_name,
  CONCAT(p.first_name, ' ', p.last_name) AS full_name,
  p.username,
  p.is_active,
  p.enterprise_id,
  p.created_at AS hired_date,

  -- Count qualifications
  (SELECT COUNT(*)
   FROM staff_qualification sq
   WHERE sq.employee_id = p.id AND sq.is_active = TRUE) AS active_qualifications_count,

  -- Count verified qualifications
  (SELECT COUNT(*)
   FROM staff_qualification sq
   WHERE sq.employee_id = p.id AND sq.is_active = TRUE AND sq.is_verified = TRUE) AS verified_qualifications_count,

  -- Count expiring qualifications (next 90 days)
  (SELECT COUNT(*)
   FROM staff_qualification sq
   WHERE sq.employee_id = p.id
     AND sq.is_active = TRUE
     AND sq.expiry_date IS NOT NULL
     AND sq.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days') AS expiring_qualifications_count,

  -- Current assignment
  (SELECT sa.assignment_type
   FROM staff_assignment sa
   WHERE sa.employee_id = p.id
     AND sa.end_date IS NULL
     AND sa.is_primary_assignment = TRUE
   LIMIT 1) AS current_assignment_type,

  (SELECT r.name
   FROM staff_assignment sa
   JOIN room r ON sa.room_id = r.id
   WHERE sa.employee_id = p.id
     AND sa.end_date IS NULL
     AND sa.is_primary_assignment = TRUE
     AND sa.assignment_type = 'room'
   LIMIT 1) AS current_room_name,

  (SELECT s.name
   FROM staff_assignment sa
   JOIN section s ON sa.section_id = s.id
   WHERE sa.employee_id = p.id
     AND sa.end_date IS NULL
     AND sa.is_primary_assignment = TRUE
     AND sa.assignment_type = 'section'
   LIMIT 1) AS current_section_name

FROM profiles p
WHERE p.role = 'Employee';

COMMENT ON VIEW staff_overview IS 'Complete overview of staff with qualifications and current assignments';

-- =====================================================
-- VIEW: upcoming_shifts
-- Description: Upcoming shifts for the next 7 days
-- =====================================================

CREATE OR REPLACE VIEW upcoming_shifts AS
SELECT
  ss.id AS shift_id,
  ss.nursery_id,
  ss.employee_id,
  CONCAT(p.first_name, ' ', p.last_name) AS employee_name,
  ss.shift_date,
  ss.start_time,
  ss.end_time,
  ss.total_hours,
  ss.shift_type,
  ss.status,
  ss.assigned_room_id,
  r.name AS room_name,
  ss.assigned_section_id,
  s.name AS section_name,
  ss.role_during_shift,
  ss.notes

FROM staff_shift ss
INNER JOIN profiles p ON ss.employee_id = p.id
LEFT JOIN room r ON ss.assigned_room_id = r.id
LEFT JOIN section s ON ss.assigned_section_id = s.id

WHERE
  ss.shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND ss.status IN ('scheduled', 'confirmed')

ORDER BY ss.shift_date, ss.start_time;

COMMENT ON VIEW upcoming_shifts IS 'All scheduled and confirmed shifts for the next 7 days';

-- =====================================================
-- VIEW: pending_absence_requests
-- Description: Absence requests awaiting approval
-- =====================================================

CREATE OR REPLACE VIEW pending_absence_requests AS
SELECT
  sa.id AS absence_id,
  sa.nursery_id,
  sa.employee_id,
  CONCAT(p.first_name, ' ', p.last_name) AS employee_name,
  p.email AS employee_email,
  sa.absence_type,
  sa.start_date,
  sa.end_date,
  sa.total_days,
  sa.is_partial_day,
  sa.partial_hours,
  sa.justification_required,
  sa.justification_status,
  sa.requested_at,
  sa.notes,
  -- Days until start
  (sa.start_date - CURRENT_DATE) AS days_until_start,
  -- Days pending
  (CURRENT_DATE - sa.requested_at::DATE) AS days_pending

FROM staff_absence sa
INNER JOIN profiles p ON sa.employee_id = p.id

WHERE sa.status = 'pending'

ORDER BY sa.requested_at;

COMMENT ON VIEW pending_absence_requests IS 'Staff absence requests awaiting approval';

-- =====================================================
-- VIEW: active_absences
-- Description: Currently active absences
-- =====================================================

CREATE OR REPLACE VIEW active_absences AS
SELECT
  sa.id AS absence_id,
  sa.nursery_id,
  sa.employee_id,
  CONCAT(p.first_name, ' ', p.last_name) AS employee_name,
  sa.absence_type,
  sa.start_date,
  sa.end_date,
  sa.total_days,
  sa.replaced_by_id,
  CONCAT(pr.first_name, ' ', pr.last_name) AS replacement_name,
  sa.replacement_notes,
  -- Days remaining
  (sa.end_date - CURRENT_DATE) AS days_remaining

FROM staff_absence sa
INNER JOIN profiles p ON sa.employee_id = p.id
LEFT JOIN profiles pr ON sa.replaced_by_id = pr.id

WHERE
  sa.status = 'approved'
  AND sa.start_date <= CURRENT_DATE
  AND sa.end_date >= CURRENT_DATE

ORDER BY sa.end_date;

COMMENT ON VIEW active_absences IS 'Currently active (ongoing) staff absences';

-- =====================================================
-- VIEW: expiring_qualifications
-- Description: Qualifications expiring in the next 90 days
-- =====================================================

CREATE OR REPLACE VIEW expiring_qualifications AS
SELECT
  sq.id AS qualification_id,
  sq.employee_id,
  CONCAT(p.first_name, ' ', p.last_name) AS employee_name,
  p.email AS employee_email,
  sq.qualification_type,
  sq.qualification_name,
  sq.qualification_level,
  sq.issue_date,
  sq.expiry_date,
  sq.issuing_organization,
  sq.is_verified,
  -- Days until expiry
  (sq.expiry_date - CURRENT_DATE) AS days_until_expiry,
  -- Urgency level
  CASE
    WHEN (sq.expiry_date - CURRENT_DATE) <= 30 THEN 'critical'
    WHEN (sq.expiry_date - CURRENT_DATE) <= 60 THEN 'high'
    ELSE 'medium'
  END AS urgency_level

FROM staff_qualification sq
INNER JOIN profiles p ON sq.employee_id = p.id

WHERE
  sq.is_active = TRUE
  AND sq.expiry_date IS NOT NULL
  AND sq.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'

ORDER BY sq.expiry_date;

COMMENT ON VIEW expiring_qualifications IS 'Staff qualifications expiring in the next 90 days';

-- =====================================================
-- VIEW: compliance_summary_daily
-- Description: Daily compliance summary by nursery
-- =====================================================

CREATE OR REPLACE VIEW compliance_summary_daily AS
SELECT
  rl.nursery_id,
  n.name AS nursery_name,
  rl.log_date,
  -- Total logs for the day
  COUNT(*) AS total_logs,
  -- Compliant logs
  SUM(CASE WHEN rl.is_compliant THEN 1 ELSE 0 END) AS compliant_logs,
  -- Non-compliant logs
  SUM(CASE WHEN NOT rl.is_compliant THEN 1 ELSE 0 END) AS non_compliant_logs,
  -- By severity
  SUM(CASE WHEN rl.non_compliance_severity = 'minor' THEN 1 ELSE 0 END) AS minor_issues,
  SUM(CASE WHEN rl.non_compliance_severity = 'moderate' THEN 1 ELSE 0 END) AS moderate_issues,
  SUM(CASE WHEN rl.non_compliance_severity = 'critical' THEN 1 ELSE 0 END) AS critical_issues,
  -- Average ratios
  AVG(rl.actual_ratio) AS avg_actual_ratio,
  MAX(rl.actual_ratio) AS max_actual_ratio,
  AVG(rl.required_ratio) AS avg_required_ratio,
  -- Average staff and children
  AVG(rl.children_present) AS avg_children_present,
  AVG(rl.staff_present) AS avg_staff_present,
  -- Qualified staff percentage
  AVG(CASE WHEN rl.staff_present > 0
    THEN (rl.qualified_staff_present::DECIMAL / rl.staff_present::DECIMAL) * 100
    ELSE 0 END) AS avg_qualified_staff_pct,
  -- Compliance rate
  ROUND((SUM(CASE WHEN rl.is_compliant THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2) AS compliance_rate

FROM ratio_log rl
INNER JOIN nursery n ON rl.nursery_id = n.id

GROUP BY rl.nursery_id, n.name, rl.log_date

ORDER BY rl.log_date DESC, rl.nursery_id;

COMMENT ON VIEW compliance_summary_daily IS 'Daily compliance summary by nursery with ratio statistics';

-- =====================================================
-- VIEW: staff_workload_summary
-- Description: Staff workload summary (shifts, hours, absences)
-- =====================================================

CREATE OR REPLACE VIEW staff_workload_summary AS
WITH shift_stats AS (
  SELECT
    employee_id,
    -- This week
    SUM(CASE
      WHEN shift_date >= DATE_TRUNC('week', CURRENT_DATE)
        AND shift_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
      THEN total_hours ELSE 0 END) AS hours_this_week,
    -- This month
    SUM(CASE
      WHEN shift_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND shift_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      THEN total_hours ELSE 0 END) AS hours_this_month,
    -- Upcoming shifts (next 7 days)
    COUNT(CASE
      WHEN shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND status IN ('scheduled', 'confirmed')
      THEN 1 END) AS upcoming_shifts_count
  FROM staff_shift
  WHERE status NOT IN ('cancelled', 'no_show')
  GROUP BY employee_id
),
absence_stats AS (
  SELECT
    employee_id,
    -- Current absences
    COUNT(CASE
      WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE AND status = 'approved'
      THEN 1 END) AS current_absences_count,
    -- Upcoming absences (next 30 days)
    COUNT(CASE
      WHEN start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND status = 'approved'
      THEN 1 END) AS upcoming_absences_count,
    -- Total absence days this year
    SUM(CASE
      WHEN EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND status = 'approved'
      THEN total_days ELSE 0 END) AS absence_days_this_year
  FROM staff_absence
  GROUP BY employee_id
)
SELECT
  p.id AS employee_id,
  CONCAT(p.first_name, ' ', p.last_name) AS employee_name,
  p.email,
  p.is_active,
  COALESCE(ss.hours_this_week, 0) AS hours_this_week,
  COALESCE(ss.hours_this_month, 0) AS hours_this_month,
  COALESCE(ss.upcoming_shifts_count, 0) AS upcoming_shifts_count,
  COALESCE(abs.current_absences_count, 0) AS current_absences_count,
  COALESCE(abs.upcoming_absences_count, 0) AS upcoming_absences_count,
  COALESCE(abs.absence_days_this_year, 0) AS absence_days_this_year

FROM profiles p
LEFT JOIN shift_stats ss ON p.id = ss.employee_id
LEFT JOIN absence_stats abs ON p.id = abs.employee_id

WHERE p.role = 'Employee'

ORDER BY p.last_name, p.first_name;

COMMENT ON VIEW staff_workload_summary IS 'Summary of staff workload including hours worked and absences';

-- =====================================================
-- GRANT PERMISSIONS (if needed)
-- =====================================================

-- Note: Permissions will be handled by RLS policies
-- These views will inherit the security model from the underlying tables

-- =====================================================
-- END OF MIGRATION
-- =====================================================
