-- =====================================================================================
-- Phase 7: Statistiques & Analyses - SQL Aggregation Functions
-- =====================================================================================
-- Description: SQL functions for calculating analytics metrics and KPIs
-- =====================================================================================

-- =====================================================================================
-- OCCUPANCY METRICS
-- =====================================================================================

-- Calculate occupancy rate for a specific date
CREATE OR REPLACE FUNCTION calculate_occupancy_rate(
  p_nursery_id UUID,
  p_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_present_count INT;
  v_total_capacity INT;
BEGIN
  -- Count children present on this date
  SELECT COUNT(*)
  INTO v_present_count
  FROM attendance
  WHERE nursery_id = p_nursery_id
    AND attendance_date = p_date
    AND status = 'PRESENT';

  -- Get total capacity of all active sections
  SELECT COALESCE(SUM(max_capacity), 0)
  INTO v_total_capacity
  FROM section
  WHERE nursery_id = p_nursery_id
    AND is_active = TRUE;

  -- Calculate occupancy rate (prevent division by zero)
  IF v_total_capacity = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((v_present_count::DECIMAL / v_total_capacity * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Calculate average occupancy rate for a date range
CREATE OR REPLACE FUNCTION calculate_avg_occupancy_rate(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT ROUND(AVG(calculate_occupancy_rate(p_nursery_id, d.date)), 2)
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(date)
  );
END;
$$ LANGUAGE plpgsql;

-- Get occupancy trend (daily breakdown for period)
CREATE OR REPLACE FUNCTION get_occupancy_trend(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  occupancy_rate DECIMAL,
  present_count INT,
  capacity INT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT
      d.date::DATE as stat_date,
      COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') as present_count,
      (SELECT SUM(s.max_capacity) FROM section s WHERE s.nursery_id = p_nursery_id AND s.is_active = TRUE) as total_capacity
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(date)
    LEFT JOIN attendance a ON a.attendance_date = d.date::DATE AND a.nursery_id = p_nursery_id
    GROUP BY d.date
  )
  SELECT
    stat_date,
    ROUND((present_count::DECIMAL / NULLIF(total_capacity, 0) * 100), 2) as occupancy_rate,
    present_count::INT,
    total_capacity::INT
  FROM daily_stats
  ORDER BY stat_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- FINANCIAL METRICS
-- =====================================================================================

-- Calculate MRR (Monthly Recurring Revenue)
CREATE OR REPLACE FUNCTION calculate_mrr(
  p_nursery_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(monthly_base_amount)
    FROM contract
    WHERE nursery_id = p_nursery_id
      AND status = 'ACTIVE'
      AND start_date <= p_date
      AND (end_date IS NULL OR end_date >= p_date)
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- Calculate ARR (Annual Recurring Revenue)
CREATE OR REPLACE FUNCTION calculate_arr(
  p_nursery_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN calculate_mrr(p_nursery_id, p_date) * 12;
END;
$$ LANGUAGE plpgsql;

-- Get revenue breakdown by contract type
CREATE OR REPLACE FUNCTION get_revenue_by_contract_type(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  contract_type contract_type,
  total_revenue DECIMAL,
  contract_count BIGINT,
  avg_monthly_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.contract_type,
    SUM(c.monthly_base_amount *
      EXTRACT(MONTH FROM AGE(
        LEAST(COALESCE(c.end_date, p_end_date), p_end_date),
        GREATEST(c.start_date, p_start_date)
      ))::INT
    ) as total_revenue,
    COUNT(c.id) as contract_count,
    ROUND(AVG(c.monthly_base_amount), 2) as avg_monthly_amount
  FROM contract c
  WHERE c.nursery_id = p_nursery_id
    AND c.start_date <= p_end_date
    AND (c.end_date IS NULL OR c.end_date >= p_start_date)
  GROUP BY c.contract_type
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate payment collection rate
CREATE OR REPLACE FUNCTION calculate_payment_collection_rate(
  p_nursery_id UUID,
  p_month INT,
  p_year INT
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_invoiced DECIMAL;
  v_total_paid DECIMAL;
BEGIN
  -- Total invoiced amount for the month
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_invoiced
  FROM invoice i
  JOIN contract c ON i.contract_id = c.id
  WHERE c.nursery_id = p_nursery_id
    AND EXTRACT(MONTH FROM i.issue_date) = p_month
    AND EXTRACT(YEAR FROM i.issue_date) = p_year;

  -- Total paid amount for the month
  SELECT COALESCE(SUM(p.amount), 0)
  INTO v_total_paid
  FROM payment p
  WHERE p.nursery_id = p_nursery_id
    AND EXTRACT(MONTH FROM p.payment_date) = p_month
    AND EXTRACT(YEAR FROM p.payment_date) = p_year;

  IF v_total_invoiced = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((v_total_paid / v_total_invoiced * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Get aging receivables report
CREATE OR REPLACE FUNCTION get_aging_receivables(
  p_nursery_id UUID
)
RETURNS TABLE (
  age_bracket VARCHAR,
  invoice_count BIGINT,
  total_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH aged_invoices AS (
    SELECT
      i.id,
      i.total_amount,
      EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::INT as days_overdue
    FROM invoice i
    JOIN contract c ON i.contract_id = c.id
    WHERE c.nursery_id = p_nursery_id
      AND i.status IN ('SENT', 'OVERDUE')
  )
  SELECT
    CASE
      WHEN days_overdue <= 30 THEN '0-30 jours'
      WHEN days_overdue <= 60 THEN '31-60 jours'
      WHEN days_overdue <= 90 THEN '61-90 jours'
      ELSE '90+ jours'
    END as age_bracket,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_amount
  FROM aged_invoices
  GROUP BY age_bracket
  ORDER BY
    CASE age_bracket
      WHEN '0-30 jours' THEN 1
      WHEN '31-60 jours' THEN 2
      WHEN '61-90 jours' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- STAFF METRICS
-- =====================================================================================

-- Calculate staff absenteeism rate
CREATE OR REPLACE FUNCTION calculate_staff_absenteeism_rate(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_working_days INT;
  v_absence_days INT;
  v_staff_count INT;
BEGIN
  -- Get number of active staff
  SELECT COUNT(*)
  INTO v_staff_count
  FROM profiles p
  WHERE p.role = 'Employee'
    AND p.is_active = TRUE
    AND p.enterprise_id = (SELECT e.id FROM nursery n JOIN enterprise e ON n.enterprise_id = e.id WHERE n.id = p_nursery_id);

  IF v_staff_count = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate total working days (staff count × days in period)
  v_total_working_days := v_staff_count * (p_end_date - p_start_date + 1);

  -- Count absence days
  SELECT COALESCE(SUM(
    EXTRACT(DAY FROM (
      LEAST(sa.end_date, p_end_date) - GREATEST(sa.start_date, p_start_date) + 1
    ))
  ), 0)::INT
  INTO v_absence_days
  FROM staff_absence sa
  WHERE sa.nursery_id = p_nursery_id
    AND sa.status IN ('APPROVED', 'IN_PROGRESS')
    AND sa.start_date <= p_end_date
    AND sa.end_date >= p_start_date;

  RETURN ROUND((v_absence_days::DECIMAL / v_total_working_days * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Calculate current staff ratio (children per staff member)
CREATE OR REPLACE FUNCTION calculate_current_staff_ratio(
  p_nursery_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  v_children_present INT;
  v_staff_on_shift INT;
BEGIN
  -- Count children present today
  SELECT COUNT(*)
  INTO v_children_present
  FROM attendance
  WHERE nursery_id = p_nursery_id
    AND attendance_date = CURRENT_DATE
    AND status = 'PRESENT';

  -- Count staff currently on shift
  SELECT COUNT(*)
  INTO v_staff_on_shift
  FROM staff_shift
  WHERE nursery_id = p_nursery_id
    AND shift_date = CURRENT_DATE
    AND scheduled_start_time <= CURRENT_TIME
    AND scheduled_end_time >= CURRENT_TIME;

  IF v_staff_on_shift = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((v_children_present::DECIMAL / v_staff_on_shift), 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- HACCP METRICS
-- =====================================================================================

-- Calculate HACCP compliance rate
CREATE OR REPLACE FUNCTION calculate_haccp_compliance_rate(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_checks INT;
  v_compliant_checks INT;
BEGIN
  -- Count total temperature checks
  SELECT COUNT(*)
  INTO v_total_checks
  FROM temperature_check
  WHERE nursery_id = p_nursery_id
    AND check_date BETWEEN p_start_date AND p_end_date;

  IF v_total_checks = 0 THEN
    RETURN 100; -- No checks = 100% compliant (no issues)
  END IF;

  -- Count compliant checks (within limits)
  SELECT COUNT(*)
  INTO v_compliant_checks
  FROM temperature_check
  WHERE nursery_id = p_nursery_id
    AND check_date BETWEEN p_start_date AND p_end_date
    AND is_within_limits = TRUE;

  RETURN ROUND((v_compliant_checks::DECIMAL / v_total_checks * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Get HACCP incidents by category
CREATE OR REPLACE FUNCTION get_haccp_incidents_by_category(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  incident_type VARCHAR,
  severity VARCHAR,
  incident_count BIGINT,
  avg_resolution_days DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hi.incident_type,
    hi.severity,
    COUNT(*) as incident_count,
    ROUND(AVG(EXTRACT(DAY FROM (hi.resolution_date - hi.incident_date))), 1) as avg_resolution_days
  FROM haccp_incident hi
  WHERE hi.nursery_id = p_nursery_id
    AND hi.incident_date BETWEEN p_start_date AND p_end_date
  GROUP BY hi.incident_type, hi.severity
  ORDER BY incident_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PARENT ENGAGEMENT METRICS
-- =====================================================================================

-- Calculate parent engagement rate (% of parents logging in weekly)
CREATE OR REPLACE FUNCTION calculate_parent_engagement_rate(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_parents INT;
  v_active_parents INT;
BEGIN
  -- Count total parents (guardians) for active children
  SELECT COUNT(DISTINCT g.id)
  INTO v_total_parents
  FROM guardian g
  JOIN child c ON g.id = c.guardian_id
  WHERE c.nursery_id = p_nursery_id
    AND c.status = 'ACTIVE';

  IF v_total_parents = 0 THEN
    RETURN 0;
  END IF;

  -- Count parents who logged in at least once per week during period
  SELECT COUNT(DISTINCT gu.guardian_id)
  INTO v_active_parents
  FROM guardian_user gu
  JOIN child c ON gu.guardian_id = c.guardian_id
  WHERE c.nursery_id = p_nursery_id
    AND c.status = 'ACTIVE'
    AND gu.last_login >= p_start_date
    AND gu.last_login <= p_end_date;

  RETURN ROUND((v_active_parents::DECIMAL / v_total_parents * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Calculate average message response time (in hours)
CREATE OR REPLACE FUNCTION calculate_avg_message_response_time(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE((
    SELECT ROUND(AVG(EXTRACT(EPOCH FROM (read_at - sent_at)) / 3600), 2)
    FROM parent_message
    WHERE nursery_id = p_nursery_id
      AND sent_at BETWEEN p_start_date AND (p_end_date + INTERVAL '1 day')
      AND read_at IS NOT NULL
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- Get timeline post engagement stats
CREATE OR REPLACE FUNCTION get_timeline_engagement_stats(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_posts BIGINT,
  total_reactions BIGINT,
  total_comments BIGINT,
  avg_reactions_per_post DECIMAL,
  avg_comments_per_post DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_posts,
    SUM(tp.reaction_count) as total_reactions,
    SUM(tp.comment_count) as total_comments,
    ROUND(AVG(tp.reaction_count), 2) as avg_reactions_per_post,
    ROUND(AVG(tp.comment_count), 2) as avg_comments_per_post
  FROM timeline_post tp
  WHERE tp.nursery_id = p_nursery_id
    AND tp.is_published = TRUE
    AND tp.published_at BETWEEN p_start_date AND (p_end_date + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- CHILDREN & ENROLLMENT METRICS
-- =====================================================================================

-- Calculate retention rate (% of children still enrolled after X months)
CREATE OR REPLACE FUNCTION calculate_retention_rate(
  p_nursery_id UUID,
  p_cohort_date DATE,
  p_months_after INT
)
RETURNS DECIMAL AS $$
DECLARE
  v_initial_count INT;
  v_retained_count INT;
BEGIN
  -- Count children enrolled in the cohort month
  SELECT COUNT(*)
  INTO v_initial_count
  FROM child
  WHERE nursery_id = p_nursery_id
    AND EXTRACT(YEAR FROM enrollment_date) = EXTRACT(YEAR FROM p_cohort_date)
    AND EXTRACT(MONTH FROM enrollment_date) = EXTRACT(MONTH FROM p_cohort_date);

  IF v_initial_count = 0 THEN
    RETURN 0;
  END IF;

  -- Count how many are still enrolled after X months
  SELECT COUNT(*)
  INTO v_retained_count
  FROM child
  WHERE nursery_id = p_nursery_id
    AND EXTRACT(YEAR FROM enrollment_date) = EXTRACT(YEAR FROM p_cohort_date)
    AND EXTRACT(MONTH FROM enrollment_date) = EXTRACT(MONTH FROM p_cohort_date)
    AND (
      departure_date IS NULL OR
      departure_date >= (p_cohort_date + (p_months_after || ' months')::INTERVAL)
    );

  RETURN ROUND((v_retained_count::DECIMAL / v_initial_count * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Get enrollment funnel (applications → admissions → contracts)
CREATE OR REPLACE FUNCTION get_enrollment_funnel(
  p_nursery_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  stage VARCHAR,
  count BIGINT,
  conversion_rate DECIMAL
) AS $$
DECLARE
  v_applications BIGINT;
  v_admissions BIGINT;
  v_contracts BIGINT;
BEGIN
  -- Count applications
  SELECT COUNT(*) INTO v_applications
  FROM application
  WHERE nursery_id = p_nursery_id
    AND submitted_at BETWEEN p_start_date AND (p_end_date + INTERVAL '1 day');

  -- Count approved admissions
  SELECT COUNT(*) INTO v_admissions
  FROM admission
  WHERE nursery_id = p_nursery_id
    AND decision_date BETWEEN p_start_date AND (p_end_date + INTERVAL '1 day')
    AND decision = 'APPROVED';

  -- Count new contracts
  SELECT COUNT(*) INTO v_contracts
  FROM contract
  WHERE nursery_id = p_nursery_id
    AND start_date BETWEEN p_start_date AND p_end_date;

  -- Return funnel stages
  RETURN QUERY
  SELECT 'Applications'::VARCHAR, v_applications, 100.00
  UNION ALL
  SELECT 'Admissions'::VARCHAR, v_admissions,
    CASE WHEN v_applications > 0 THEN ROUND((v_admissions::DECIMAL / v_applications * 100), 2) ELSE 0 END
  UNION ALL
  SELECT 'Contrats'::VARCHAR, v_contracts,
    CASE WHEN v_admissions > 0 THEN ROUND((v_contracts::DECIMAL / v_admissions * 100), 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- DASHBOARD SUMMARY (All KPIs in one call)
-- =====================================================================================

-- Get dashboard summary with all key metrics
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_nursery_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  metric_name VARCHAR,
  metric_value DECIMAL,
  metric_unit VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'occupancy_rate'::VARCHAR, calculate_occupancy_rate(p_nursery_id, p_date), '%'::VARCHAR
  UNION ALL
  SELECT 'mrr'::VARCHAR, calculate_mrr(p_nursery_id, p_date), 'EUR'::VARCHAR
  UNION ALL
  SELECT 'arr'::VARCHAR, calculate_arr(p_nursery_id, p_date), 'EUR'::VARCHAR
  UNION ALL
  SELECT 'staff_ratio'::VARCHAR, calculate_current_staff_ratio(p_nursery_id), 'ratio'::VARCHAR
  UNION ALL
  SELECT 'haccp_compliance'::VARCHAR, calculate_haccp_compliance_rate(p_nursery_id, p_date - 30, p_date), '%'::VARCHAR
  UNION ALL
  SELECT 'active_children'::VARCHAR,
    (SELECT COUNT(*)::DECIMAL FROM child WHERE nursery_id = p_nursery_id AND status = 'ACTIVE'), 'count'::VARCHAR
  UNION ALL
  SELECT 'active_staff'::VARCHAR,
    (SELECT COUNT(*)::DECIMAL FROM profiles p
     WHERE p.role = 'Employee' AND p.is_active = TRUE
       AND p.enterprise_id = (SELECT e.id FROM nursery n JOIN enterprise e ON n.enterprise_id = e.id WHERE n.id = p_nursery_id)
    ), 'count'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON FUNCTION calculate_occupancy_rate IS 'Calculate occupancy rate for a specific date';
COMMENT ON FUNCTION calculate_mrr IS 'Calculate Monthly Recurring Revenue (MRR)';
COMMENT ON FUNCTION calculate_staff_absenteeism_rate IS 'Calculate staff absenteeism rate for a period';
COMMENT ON FUNCTION calculate_haccp_compliance_rate IS 'Calculate HACCP compliance rate based on temperature checks';
COMMENT ON FUNCTION calculate_parent_engagement_rate IS 'Calculate parent engagement rate (% logging in weekly)';
COMMENT ON FUNCTION get_dashboard_summary IS 'Get all key metrics for dashboard in one call';
