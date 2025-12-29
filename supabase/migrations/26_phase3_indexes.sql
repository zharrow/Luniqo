-- =====================================================
-- PHASE 3: PERSONNEL & PLANNING RH - ADDITIONAL INDEXES
-- Migration: 26_phase3_indexes.sql
-- Description: Additional performance indexes for complex queries
-- =====================================================

-- =====================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =====================================================

-- Staff qualifications: Find expiring qualifications by nursery
CREATE INDEX IF NOT EXISTS idx_staff_qual_nursery_expiry ON staff_qualification(employee_id, expiry_date, is_active)
  WHERE expiry_date IS NOT NULL AND is_active = TRUE;

-- Staff qualifications: Find unverified qualifications
CREATE INDEX IF NOT EXISTS idx_staff_qual_unverified ON staff_qualification(employee_id, is_verified, created_at)
  WHERE is_verified = FALSE;

-- Staff qualifications: Search by type and level
CREATE INDEX IF NOT EXISTS idx_staff_qual_type_level ON staff_qualification(qualification_type, qualification_level, is_active);

-- Staff documents: Find pending documents by employee
CREATE INDEX IF NOT EXISTS idx_staff_doc_pending ON staff_document(employee_id, status, created_at)
  WHERE status = 'pending';

-- Staff documents: Find expiring documents
CREATE INDEX IF NOT EXISTS idx_staff_doc_expiring ON staff_document(employee_id, expiry_date, document_type)
  WHERE expiry_date IS NOT NULL AND status != 'expired';

-- Staff authorizations: Active authorizations by nursery and type
CREATE INDEX IF NOT EXISTS idx_staff_auth_active_type ON staff_authorization(nursery_id, authorization_type, employee_id)
  WHERE NOT revoked;

-- Staff shifts: Upcoming shifts by employee
CREATE INDEX IF NOT EXISTS idx_staff_shift_upcoming ON staff_shift(employee_id, shift_date, status)
  WHERE status IN ('scheduled', 'confirmed') AND shift_date >= CURRENT_DATE;

-- Staff shifts: Today's shifts by nursery
CREATE INDEX IF NOT EXISTS idx_staff_shift_today ON staff_shift(nursery_id, shift_date, status)
  WHERE shift_date = CURRENT_DATE;

-- Staff shifts: Find shifts needing confirmation
CREATE INDEX IF NOT EXISTS idx_staff_shift_unconfirmed ON staff_shift(nursery_id, shift_date, status)
  WHERE status = 'scheduled';

-- Staff absences: Pending approval requests by nursery
CREATE INDEX IF NOT EXISTS idx_staff_absence_approval ON staff_absence(nursery_id, status, requested_at)
  WHERE status = 'pending';

-- Staff absences: Current and future absences
CREATE INDEX IF NOT EXISTS idx_staff_absence_upcoming ON staff_absence(employee_id, start_date, end_date, status)
  WHERE status = 'approved' AND end_date >= CURRENT_DATE;

-- Staff absences: Find absences needing replacement
CREATE INDEX IF NOT EXISTS idx_staff_absence_replacement ON staff_absence(nursery_id, start_date, replaced_by_id, status)
  WHERE status = 'approved' AND replaced_by_id IS NULL;

-- Staff availability: Current availability by employee
CREATE INDEX IF NOT EXISTS idx_staff_avail_current ON staff_availability(employee_id, day_of_week, is_available)
  WHERE valid_until IS NULL OR valid_until >= CURRENT_DATE;

-- Ratio logs: Recent non-compliant logs
CREATE INDEX IF NOT EXISTS idx_ratio_log_recent_issues ON ratio_log(nursery_id, log_timestamp, non_compliance_severity)
  WHERE NOT is_compliant AND log_timestamp >= NOW() - INTERVAL '7 days';

-- Ratio logs: Daily summary
CREATE INDEX IF NOT EXISTS idx_ratio_log_daily ON ratio_log(nursery_id, log_date, log_hour, is_compliant);

-- Regulatory reports: Recent reports by type
CREATE INDEX IF NOT EXISTS idx_regulatory_report_recent ON regulatory_report(nursery_id, report_type, report_date DESC);

-- =====================================================
-- TEXT SEARCH INDEXES
-- =====================================================

-- Search staff qualifications by name
CREATE INDEX IF NOT EXISTS idx_staff_qual_name_search ON staff_qualification
  USING GIN (to_tsvector('french', qualification_name));

-- Search staff documents by file name
CREATE INDEX IF NOT EXISTS idx_staff_doc_filename_search ON staff_document
  USING GIN (to_tsvector('french', file_name));

-- =====================================================
-- PARTIAL INDEXES FOR FILTERING
-- =====================================================

-- Active staff with qualifications
CREATE INDEX IF NOT EXISTS idx_active_staff_with_quals ON staff_qualification(employee_id)
  WHERE is_active = TRUE
  INCLUDE (qualification_type, qualification_level, expiry_date);

-- Current shifts in progress
CREATE INDEX IF NOT EXISTS idx_shifts_in_progress ON staff_shift(nursery_id, employee_id, actual_start_time)
  WHERE status = 'in_progress' AND actual_end_time IS NULL;

-- Approved absences without replacement
CREATE INDEX IF NOT EXISTS idx_absences_need_replacement ON staff_absence(nursery_id, employee_id, start_date, end_date)
  WHERE status = 'approved' AND replaced_by_id IS NULL AND end_date >= CURRENT_DATE;

-- =====================================================
-- COVERING INDEXES (INCLUDE columns for index-only scans)
-- =====================================================

-- Staff shifts with employee details (for listing views)
CREATE INDEX IF NOT EXISTS idx_staff_shift_list ON staff_shift(nursery_id, shift_date)
  INCLUDE (employee_id, start_time, end_time, status, assigned_room_id)
  WHERE shift_date >= CURRENT_DATE - INTERVAL '30 days';

-- Staff absences with details (for calendar views)
CREATE INDEX IF NOT EXISTS idx_staff_absence_calendar ON staff_absence(nursery_id, start_date, end_date)
  INCLUDE (employee_id, absence_type, status, replaced_by_id)
  WHERE status != 'rejected';

-- =====================================================
-- STATISTICS UPDATE
-- =====================================================

-- Ensure PostgreSQL has accurate statistics for query planning
ANALYZE staff_qualification;
ANALYZE staff_document;
ANALYZE staff_authorization;
ANALYZE staff_shift;
ANALYZE staff_absence;
ANALYZE staff_availability;
ANALYZE staff_assignment;
ANALYZE regulatory_report;
ANALYZE ratio_log;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_staff_qual_nursery_expiry IS 'Find expiring qualifications for a nursery';
COMMENT ON INDEX idx_staff_doc_pending IS 'Find pending documents awaiting review';
COMMENT ON INDEX idx_staff_shift_upcoming IS 'Upcoming shifts for an employee';
COMMENT ON INDEX idx_staff_absence_approval IS 'Absence requests pending approval';
COMMENT ON INDEX idx_ratio_log_recent_issues IS 'Recent non-compliant ratio logs (last 7 days)';
COMMENT ON INDEX idx_shifts_in_progress IS 'Shifts currently in progress (clocked in but not out)';
COMMENT ON INDEX idx_absences_need_replacement IS 'Approved absences that still need a replacement staff member';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
