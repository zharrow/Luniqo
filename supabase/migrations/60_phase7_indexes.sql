-- =====================================================================================
-- Phase 7: Statistiques & Analyses - Performance Indexes
-- =====================================================================================
-- Description: Additional indexes on existing tables for analytics query optimization
-- =====================================================================================

-- =====================================================================================
-- CHILD TABLE - Enrollment Analytics
-- =====================================================================================

-- Optimize: Count active children by section and age range
CREATE INDEX IF NOT EXISTS idx_child_analytics_active
ON child(nursery_id, status, section_id, date_of_birth)
WHERE status = 'ACTIVE';

-- Optimize: Track enrollment/departure trends over time
CREATE INDEX IF NOT EXISTS idx_child_enrollment_trends
ON child(nursery_id, enrollment_date DESC)
WHERE enrollment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_child_departure_trends
ON child(nursery_id, departure_date DESC)
WHERE departure_date IS NOT NULL;

-- =====================================================================================
-- CONTRACT TABLE - Financial Analytics
-- =====================================================================================

-- Optimize: Calculate MRR (Monthly Recurring Revenue)
CREATE INDEX IF NOT EXISTS idx_contract_mrr_calculation
ON contract(nursery_id, status, contract_type, monthly_base_amount)
WHERE status = 'ACTIVE';

-- Optimize: Track contract lifecycle (start/end dates)
CREATE INDEX IF NOT EXISTS idx_contract_lifecycle
ON contract(nursery_id, start_date, end_date);

-- Optimize: Group revenue by contract type
CREATE INDEX IF NOT EXISTS idx_contract_revenue_by_type
ON contract(nursery_id, contract_type, monthly_base_amount)
WHERE status = 'ACTIVE';

-- =====================================================================================
-- INVOICE TABLE - Aging & Payment Analytics
-- =====================================================================================

-- Optimize: Calculate aging receivables (0-30, 30-60, 60-90, 90+ days)
CREATE INDEX IF NOT EXISTS idx_invoice_aging_analysis
ON invoice(nursery_id, status, due_date DESC, total_amount)
WHERE status IN ('SENT', 'OVERDUE');

-- Optimize: Track payment performance over time
CREATE INDEX IF NOT EXISTS idx_invoice_payment_trends
ON invoice(nursery_id, issue_date DESC, status, total_amount);

-- Optimize: Find overdue invoices by severity
CREATE INDEX IF NOT EXISTS idx_invoice_overdue_severity
ON invoice(nursery_id, due_date, total_amount)
WHERE status = 'OVERDUE';

-- =====================================================================================
-- PAYMENT TABLE - Payment Analytics
-- =====================================================================================

-- Optimize: Analyze payment methods and amounts
CREATE INDEX IF NOT EXISTS idx_payment_method_analysis
ON payment(nursery_id, payment_method, amount, payment_date DESC);

-- Optimize: Calculate total payments by period
CREATE INDEX IF NOT EXISTS idx_payment_period_totals
ON payment(nursery_id, payment_date DESC, amount);

-- =====================================================================================
-- ATTENDANCE TABLE - Occupancy Analytics
-- =====================================================================================

-- Optimize: Calculate daily occupancy rates
CREATE INDEX IF NOT EXISTS idx_attendance_occupancy_rate
ON attendance(nursery_id, attendance_date, status)
WHERE status IN ('PRESENT', 'ABSENT_NOTIFIED');

-- Optimize: Track attendance patterns by child
CREATE INDEX IF NOT EXISTS idx_attendance_child_patterns
ON attendance(child_id, attendance_date DESC, status);

-- Optimize: Occupancy analysis by section
CREATE INDEX IF NOT EXISTS idx_attendance_section_occupancy
ON attendance(nursery_id, attendance_date, status)
WHERE status = 'PRESENT';

-- =====================================================================================
-- STAFF_SHIFT TABLE - Staff Hours Analytics
-- =====================================================================================

-- Optimize: Calculate total staff hours by period
CREATE INDEX IF NOT EXISTS idx_staff_shift_hours_analysis
ON staff_shift(nursery_id, shift_date DESC, employee_id);

-- Optimize: Overtime tracking
CREATE INDEX IF NOT EXISTS idx_staff_shift_overtime
ON staff_shift(nursery_id, shift_date DESC, employee_id)
WHERE actual_end_time > scheduled_end_time;

-- =====================================================================================
-- STAFF_ABSENCE TABLE - Absenteeism Analytics
-- =====================================================================================

-- Optimize: Calculate absenteeism rates
CREATE INDEX IF NOT EXISTS idx_staff_absence_rate_calculation
ON staff_absence(nursery_id, absence_type, start_date, end_date)
WHERE status IN ('APPROVED', 'IN_PROGRESS');

-- Optimize: Track absence trends by type
CREATE INDEX IF NOT EXISTS idx_staff_absence_trends
ON staff_absence(nursery_id, absence_type, start_date DESC);

-- Optimize: Find current absences
CREATE INDEX IF NOT EXISTS idx_staff_absence_current
ON staff_absence(nursery_id, start_date, end_date)
WHERE status = 'IN_PROGRESS';

-- =====================================================================================
-- HACCP_INCIDENT TABLE - HACCP Compliance Analytics
-- =====================================================================================

-- Optimize: Track incident trends and severity
CREATE INDEX IF NOT EXISTS idx_haccp_incident_trends
ON haccp_incident(nursery_id, incident_type, severity, incident_date DESC);

-- Optimize: Calculate resolution time (for KPIs)
CREATE INDEX IF NOT EXISTS idx_haccp_incident_resolution_time
ON haccp_incident(nursery_id, incident_date, resolution_date)
WHERE resolution_date IS NOT NULL;

-- Optimize: Find unresolved critical incidents
CREATE INDEX IF NOT EXISTS idx_haccp_incident_unresolved_critical
ON haccp_incident(nursery_id, severity, incident_date DESC)
WHERE resolution_date IS NULL AND severity IN ('CRITICAL', 'MAJOR');

-- =====================================================================================
-- TEMPERATURE_CHECK TABLE - Temperature Compliance Analytics
-- =====================================================================================

-- Optimize: Find out-of-range temperatures
CREATE INDEX IF NOT EXISTS idx_temperature_check_out_of_range
ON temperature_check(nursery_id, check_date DESC)
WHERE is_within_limits = FALSE;

-- Optimize: Compliance rate calculation
CREATE INDEX IF NOT EXISTS idx_temperature_check_compliance
ON temperature_check(nursery_id, check_date DESC, is_within_limits);

-- =====================================================================================
-- TIMELINE_POST TABLE - Parent Engagement Analytics
-- =====================================================================================

-- Optimize: Count posts per day/week/month
CREATE INDEX IF NOT EXISTS idx_timeline_post_frequency
ON timeline_post(nursery_id, published_at DESC)
WHERE is_published = TRUE;

-- Optimize: Track engagement (reactions + comments)
CREATE INDEX IF NOT EXISTS idx_timeline_post_engagement
ON timeline_post(nursery_id, published_at DESC, reaction_count, comment_count)
WHERE is_published = TRUE;

-- =====================================================================================
-- PARENT_MESSAGE TABLE - Messaging Analytics
-- =====================================================================================

-- Optimize: Calculate response time
CREATE INDEX IF NOT EXISTS idx_parent_message_response_time
ON parent_message(nursery_id, sent_at, read_at)
WHERE read_at IS NOT NULL;

-- Optimize: Track unread messages
CREATE INDEX IF NOT EXISTS idx_parent_message_unread
ON parent_message(nursery_id, sent_at DESC)
WHERE read_at IS NULL;

-- =====================================================================================
-- PARENT_NOTIFICATION TABLE - Notification Analytics
-- =====================================================================================

-- Optimize: Track notification delivery success
CREATE INDEX IF NOT EXISTS idx_parent_notification_delivery
ON parent_notification(nursery_id, notification_type, sent_at, delivered_at);

-- Optimize: Find failed notifications
CREATE INDEX IF NOT EXISTS idx_parent_notification_failed
ON parent_notification(nursery_id, sent_at DESC)
WHERE delivered_at IS NULL AND sent_at < NOW() - INTERVAL '1 hour';

-- =====================================================================================
-- PARENT_DOCUMENT_SHARE TABLE - Document Engagement Analytics
-- =====================================================================================

-- Optimize: Track document read rates
CREATE INDEX IF NOT EXISTS idx_parent_document_engagement
ON parent_document_share(nursery_id, shared_at DESC);

-- Optimize: Find unacknowledged critical documents
CREATE INDEX IF NOT EXISTS idx_parent_document_unacknowledged
ON parent_document_share(nursery_id, shared_at DESC, requires_acknowledgment)
WHERE requires_acknowledgment = TRUE;

-- =====================================================================================
-- SECTION TABLE - Capacity Analytics
-- =====================================================================================

-- Optimize: Calculate total capacity by nursery
CREATE INDEX IF NOT EXISTS idx_section_capacity_calculation
ON section(nursery_id, max_capacity, is_active)
WHERE is_active = TRUE;

-- =====================================================================================
-- GUARDIAN TABLE - Family Analytics
-- =====================================================================================

-- Optimize: Count families per nursery (via children)
CREATE INDEX IF NOT EXISTS idx_guardian_family_count
ON guardian(is_primary);

-- =====================================================================================
-- PROFILES TABLE - Staff Analytics
-- =====================================================================================

-- Optimize: Count active staff by role
CREATE INDEX IF NOT EXISTS idx_profiles_staff_count
ON profiles(enterprise_id, role, is_active)
WHERE role = 'Employee' AND is_active = TRUE;

-- =====================================================================================
-- MATERIALIZED VIEWS FOR HEAVY ANALYTICS (Optional - Phase ultérieure)
-- =====================================================================================
-- These could be created in the future for very heavy aggregations
-- Example: Daily occupancy summary per nursery (pre-calculated)

-- CREATE MATERIALIZED VIEW mv_daily_occupancy_summary AS
-- SELECT
--   a.nursery_id,
--   a.attendance_date,
--   COUNT(*) FILTER (WHERE a.status = 'PRESENT') as present_count,
--   COUNT(*) FILTER (WHERE a.status = 'ABSENT_NOTIFIED') as absent_count,
--   (SELECT SUM(s.max_capacity) FROM section s WHERE s.nursery_id = a.nursery_id AND s.is_active = TRUE) as total_capacity,
--   ROUND(
--     (COUNT(*) FILTER (WHERE a.status = 'PRESENT')::DECIMAL /
--     NULLIF((SELECT SUM(s.max_capacity) FROM section s WHERE s.nursery_id = a.nursery_id AND s.is_active = TRUE), 0) * 100
--   ), 2) as occupancy_rate
-- FROM attendance a
-- GROUP BY a.nursery_id, a.attendance_date;

-- CREATE UNIQUE INDEX idx_mv_daily_occupancy_pk ON mv_daily_occupancy_summary(nursery_id, attendance_date);
-- CREATE INDEX idx_mv_daily_occupancy_date ON mv_daily_occupancy_summary(attendance_date DESC);

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON INDEX idx_child_analytics_active IS 'Optimize active children count by section and age';
COMMENT ON INDEX idx_contract_mrr_calculation IS 'Optimize MRR (Monthly Recurring Revenue) calculation';
COMMENT ON INDEX idx_invoice_aging_analysis IS 'Optimize aging receivables calculation';
COMMENT ON INDEX idx_attendance_occupancy_rate IS 'Optimize daily occupancy rate calculation';
COMMENT ON INDEX idx_staff_absence_rate_calculation IS 'Optimize staff absenteeism rate calculation';
COMMENT ON INDEX idx_haccp_incident_trends IS 'Optimize HACCP incident trend analysis';
COMMENT ON INDEX idx_timeline_post_engagement IS 'Optimize parent engagement metrics';
COMMENT ON INDEX idx_parent_message_response_time IS 'Optimize message response time calculation';
