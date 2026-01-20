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
ON child(nursery_id, is_active, section, birth_date)
WHERE is_active = TRUE;

-- Optimize: Track enrollment/departure trends over time
CREATE INDEX IF NOT EXISTS idx_child_enrollment_trends
ON child(nursery_id, admission_date DESC)
WHERE admission_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_child_departure_trends
ON child(nursery_id, exit_date DESC)
WHERE exit_date IS NOT NULL;

-- =====================================================================================
-- CONTRACT TABLE - Financial Analytics
-- =====================================================================================

-- Optimize: Calculate MRR (Monthly Recurring Revenue)
CREATE INDEX IF NOT EXISTS idx_contract_mrr_calculation
ON contract(nursery_id, status, contract_type, monthly_rate)
WHERE status = 'active';

-- Optimize: Track contract lifecycle (start/end dates)
CREATE INDEX IF NOT EXISTS idx_contract_lifecycle
ON contract(nursery_id, start_date, end_date);

-- Optimize: Group revenue by contract type
CREATE INDEX IF NOT EXISTS idx_contract_revenue_by_type
ON contract(nursery_id, contract_type, monthly_rate)
WHERE status = 'active';

-- =====================================================================================
-- INVOICE TABLE - Aging & Payment Analytics
-- =====================================================================================

-- Optimize: Calculate aging receivables (0-30, 30-60, 60-90, 90+ days)
CREATE INDEX IF NOT EXISTS idx_invoice_aging_analysis
ON invoice(nursery_id, status, due_date DESC, total_amount)
WHERE status IN ('sent', 'overdue');

-- Optimize: Track payment performance over time
CREATE INDEX IF NOT EXISTS idx_invoice_payment_trends
ON invoice(nursery_id, invoice_date DESC, status, total_amount);

-- Optimize: Find overdue invoices by severity
CREATE INDEX IF NOT EXISTS idx_invoice_overdue_severity
ON invoice(nursery_id, due_date, total_amount)
WHERE status = 'overdue';

-- =====================================================================================
-- PAYMENT TABLE - Payment Analytics
-- =====================================================================================

-- Optimize: Analyze payment methods and amounts (via payment_method_id FK)
CREATE INDEX IF NOT EXISTS idx_payment_method_analysis
ON payment(nursery_id, payment_method_id, amount, payment_date DESC);

-- Optimize: Calculate total payments by period
CREATE INDEX IF NOT EXISTS idx_payment_period_totals
ON payment(nursery_id, payment_date DESC, amount);

-- =====================================================================================
-- HACCP_INCIDENT TABLE - HACCP Compliance Analytics
-- =====================================================================================

-- Optimize: Track incident trends by type
CREATE INDEX IF NOT EXISTS idx_haccp_incident_trends
ON haccp_incident(nursery_id, type, report_date DESC);

-- Optimize: Find unresolved incidents
CREATE INDEX IF NOT EXISTS idx_haccp_incident_unresolved
ON haccp_incident(nursery_id, status, report_date DESC)
WHERE status = 'Open';

-- =====================================================================================
-- TEMPERATURE_CHECK TABLE - Temperature Compliance Analytics
-- =====================================================================================

-- Optimize: Find non-compliant temperatures
CREATE INDEX IF NOT EXISTS idx_temperature_check_non_compliant
ON temperature_check(meal_id, control_date DESC)
WHERE is_compliant = FALSE;

-- Optimize: Compliance rate calculation
CREATE INDEX IF NOT EXISTS idx_temperature_check_compliance
ON temperature_check(meal_id, control_date DESC, is_compliant);

-- =====================================================================================
-- TIMELINE_POST TABLE - Parent Engagement Analytics
-- =====================================================================================

-- Optimize: Count posts per day/week/month
CREATE INDEX IF NOT EXISTS idx_timeline_post_frequency
ON timeline_post(nursery_id, published_at DESC)
WHERE is_visible_to_parents = TRUE;

-- Optimize: Track engagement (reactions + comments)
CREATE INDEX IF NOT EXISTS idx_timeline_post_engagement
ON timeline_post(nursery_id, published_at DESC, parent_comments_count)
WHERE is_visible_to_parents = TRUE;

-- =====================================================================================
-- PARENT_MESSAGE TABLE - Messaging Analytics
-- =====================================================================================

-- Optimize: Calculate response time
CREATE INDEX IF NOT EXISTS idx_parent_message_response_time
ON parent_message(nursery_id, created_at, read_at)
WHERE read_at IS NOT NULL;

-- Optimize: Track unread messages
CREATE INDEX IF NOT EXISTS idx_parent_message_unread
ON parent_message(nursery_id, created_at DESC)
WHERE is_read = FALSE;

-- =====================================================================================
-- PARENT_NOTIFICATION TABLE - Notification Analytics
-- =====================================================================================

-- Optimize: Track notification delivery success
CREATE INDEX IF NOT EXISTS idx_parent_notification_delivery
ON parent_notification(notification_type, push_sent, push_sent_at);

-- Optimize: Find failed notifications
CREATE INDEX IF NOT EXISTS idx_parent_notification_failed
ON parent_notification(created_at DESC)
WHERE push_sent = FALSE;

-- =====================================================================================
-- PARENT_DOCUMENT_SHARE TABLE - Document Engagement Analytics
-- =====================================================================================

-- Optimize: Track document read rates
CREATE INDEX IF NOT EXISTS idx_parent_document_engagement
ON parent_document_share(nursery_id, published_at DESC);

-- Optimize: Find unacknowledged critical documents
CREATE INDEX IF NOT EXISTS idx_parent_document_unacknowledged
ON parent_document_share(nursery_id, published_at DESC)
WHERE requires_acknowledgment = TRUE;

-- =====================================================================================
-- SECTION TABLE - Capacity Analytics
-- =====================================================================================

-- Optimize: Calculate total capacity by nursery
CREATE INDEX IF NOT EXISTS idx_section_capacity_calculation
ON section(nursery_id, capacity, is_active)
WHERE is_active = TRUE;

-- =====================================================================================
-- GUARDIAN TABLE - Family Analytics
-- =====================================================================================

-- Optimize: Count guardians per family
CREATE INDEX IF NOT EXISTS idx_guardian_family_count
ON guardian(family_id, legal_responsibility);

-- =====================================================================================
-- PROFILES TABLE - Staff Analytics
-- =====================================================================================

-- Optimize: Count active staff by role
CREATE INDEX IF NOT EXISTS idx_profiles_staff_count
ON profiles(enterprise_id, role, is_active)
WHERE role = 'Employee' AND is_active = TRUE;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON INDEX idx_child_analytics_active IS 'Optimize active children count by section and age';
COMMENT ON INDEX idx_contract_mrr_calculation IS 'Optimize MRR (Monthly Recurring Revenue) calculation';
COMMENT ON INDEX idx_invoice_aging_analysis IS 'Optimize aging receivables calculation';
COMMENT ON INDEX idx_haccp_incident_trends IS 'Optimize HACCP incident trend analysis';
COMMENT ON INDEX idx_timeline_post_engagement IS 'Optimize parent engagement metrics';
COMMENT ON INDEX idx_parent_message_response_time IS 'Optimize message response time calculation';
